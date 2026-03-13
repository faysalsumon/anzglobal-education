import type { Express, Request, Response } from "express";
import { db } from "./db";
import { isAuthenticated } from "./supabase-middleware";
import { checkAdminAccess } from "./routes";
import {
  accChartOfAccounts,
  accCustomers,
  accItems,
  accInvoices,
  accInvoiceLineItems,
  accPaymentsReceived,
  accCreditNotes,
  accCreditNoteItems,
  insertAccChartOfAccountsSchema,
  insertAccCustomerSchema,
  insertAccItemSchema,
  insertAccPaymentReceivedSchema,
  type AccInvoice,
  type AccCustomer,
  type AccInvoiceLineItem,
  type AccPaymentReceived,
  type AccCreditNote,
  type AccChartOfAccount,
  type AccItem,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte, ilike } from "drizzle-orm";
import { sendInvoiceEmail, sendPaymentReceiptEmail, sendInvoiceReminderEmail } from "./email-service";

const FINANCE_ADMIN_ROLES: Array<'cto' | 'platform_admin'> = ['cto', 'platform_admin'];

async function requireFinanceAdmin(req: Request, res: Response): Promise<string | null> {
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ message: "Not authenticated" }); return null; }
  const access = await checkAdminAccess(userId, FINANCE_ADMIN_ROLES);
  if (!access) { res.status(403).json({ message: "Finance admin access required" }); return null; }
  return userId;
}

async function markOverdueInvoices(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await db.update(accInvoices)
    .set({ status: "overdue", updatedAt: new Date() })
    .where(
      and(
        sql`${accInvoices.status} IN ('sent', 'partially_paid')`,
        lte(accInvoices.dueDate, today)
      )
    );
}

const SEED_ACCOUNTS: Array<{ code: string; name: string; accountType: 'asset' | 'liability' | 'income' | 'expense' | 'equity'; description: string }> = [
  { code: '1000', name: 'Cash and Cash Equivalents', accountType: 'asset', description: 'Bank accounts and cash on hand' },
  { code: '1100', name: 'Accounts Receivable', accountType: 'asset', description: 'Amounts owed by customers' },
  { code: '1200', name: 'Prepaid Expenses', accountType: 'asset', description: 'Advance payments for services' },
  { code: '2000', name: 'Accounts Payable', accountType: 'liability', description: 'Amounts owed to suppliers' },
  { code: '2100', name: 'GST Payable', accountType: 'liability', description: 'Goods and Services Tax collected' },
  { code: '2200', name: 'Accrued Liabilities', accountType: 'liability', description: 'Expenses incurred but not yet paid' },
  { code: '3000', name: 'Owner Equity', accountType: 'equity', description: 'Owner capital investment' },
  { code: '3100', name: 'Retained Earnings', accountType: 'equity', description: 'Accumulated profits' },
  { code: '4000', name: 'Consulting Income', accountType: 'income', description: 'Revenue from education consulting services' },
  { code: '4100', name: 'Commission Income', accountType: 'income', description: 'Commission from university partnerships' },
  { code: '4200', name: 'Application Fee Income', accountType: 'income', description: 'Fees charged for application processing' },
  { code: '4300', name: 'Visa Processing Income', accountType: 'income', description: 'Revenue from visa processing services' },
  { code: '4400', name: 'Other Income', accountType: 'income', description: 'Miscellaneous income' },
  { code: '5000', name: 'Salaries & Wages', accountType: 'expense', description: 'Employee compensation' },
  { code: '5100', name: 'Rent & Utilities', accountType: 'expense', description: 'Office rent and utility bills' },
  { code: '5200', name: 'Marketing & Advertising', accountType: 'expense', description: 'Promotional expenses' },
  { code: '5300', name: 'Travel & Transport', accountType: 'expense', description: 'Business travel expenses' },
  { code: '5400', name: 'Office Supplies', accountType: 'expense', description: 'Stationery and office supplies' },
  { code: '5500', name: 'Professional Fees', accountType: 'expense', description: 'Legal, accounting and advisory fees' },
  { code: '5600', name: 'Other Expenses', accountType: 'expense', description: 'Miscellaneous expenses' },
];

async function seedChartOfAccounts(): Promise<void> {
  try {
    const existing = await db.select({ code: accChartOfAccounts.code }).from(accChartOfAccounts);
    const existingCodes = new Set(existing.map(e => e.code));
    const toInsert = SEED_ACCOUNTS.filter(a => !existingCodes.has(a.code));
    if (toInsert.length > 0) {
      await db.insert(accChartOfAccounts).values(toInsert.map(a => ({ ...a, isSystem: true })));
      console.log(`[Accounting] Seeded ${toInsert.length} chart of accounts entries`);
    }
  } catch (error) {
    console.error('[Accounting] Error seeding chart of accounts:', error);
  }
}

async function generateInvoiceNumber(regionCode: string, maxRetries = 3): Promise<string> {
  const prefix = `ANZ-${regionCode.toUpperCase()}-`;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await db.select({ invoiceNumber: accInvoices.invoiceNumber })
      .from(accInvoices)
      .where(ilike(accInvoices.invoiceNumber, `${prefix}%`))
      .orderBy(desc(accInvoices.invoiceNumber))
      .limit(1);

    let nextNum = 1;
    if (result.length > 0) {
      const lastNum = parseInt(result[0].invoiceNumber.split('-').pop() || '0', 10);
      nextNum = lastNum + 1;
    }
    const candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;

    const [existing] = await db.select({ id: accInvoices.id }).from(accInvoices).where(eq(accInvoices.invoiceNumber, candidate)).limit(1);
    if (!existing) return candidate;
    nextNum++;
    const fallback = `${prefix}${String(nextNum).padStart(4, '0')}`;
    const [existingFallback] = await db.select({ id: accInvoices.id }).from(accInvoices).where(eq(accInvoices.invoiceNumber, fallback)).limit(1);
    if (!existingFallback) return fallback;
  }
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}${timestamp}`;
}

export function registerAccountingRoutes(app: Express) {

  seedChartOfAccounts();
  markOverdueInvoices();

  // ── Chart of Accounts ───────────────────────────────────────────────────

  app.get("/api/accounting/chart-of-accounts", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const accounts = await db.select().from(accChartOfAccounts).orderBy(accChartOfAccounts.code);
    res.json(accounts);
  });

  app.post("/api/accounting/chart-of-accounts", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const parsed = insertAccChartOfAccountsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    const [account] = await db.insert(accChartOfAccounts).values(parsed.data).returning();
    res.json(account);
  });

  app.patch("/api/accounting/chart-of-accounts/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const { id } = req.params;
    const { code, name, accountType, description, isActive } = req.body;
    const updates: Record<string, any> = {};
    if (code !== undefined) updates.code = code;
    if (name !== undefined) updates.name = name;
    if (accountType !== undefined) updates.accountType = accountType;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;
    const [updated] = await db.update(accChartOfAccounts).set(updates).where(eq(accChartOfAccounts.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Account not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/chart-of-accounts/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const { id } = req.params;
    const [existing] = await db.select().from(accChartOfAccounts).where(eq(accChartOfAccounts.id, id));
    if (!existing) return res.status(404).json({ message: "Account not found" });
    if (existing.isSystem) return res.status(400).json({ message: "Cannot delete system accounts" });
    await db.delete(accChartOfAccounts).where(eq(accChartOfAccounts.id, id));
    res.json({ success: true });
  });

  // ── Customers ───────────────────────────────────────────────────────────

  app.get("/api/accounting/customers", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const customers = await db.select().from(accCustomers).orderBy(desc(accCustomers.createdAt));
    res.json(customers);
  });

  app.get("/api/accounting/customers/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const [customer] = await db.select().from(accCustomers).where(eq(accCustomers.id, req.params.id));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.post("/api/accounting/customers", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const parsed = insertAccCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    const [customer] = await db.insert(accCustomers).values(parsed.data).returning();
    res.json(customer);
  });

  app.patch("/api/accounting/customers/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const { name, email, phone, address, currency, crmContactId, isActive } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (currency !== undefined) updates.currency = currency;
    if (crmContactId !== undefined) updates.crmContactId = crmContactId;
    if (isActive !== undefined) updates.isActive = isActive;
    const [updated] = await db.update(accCustomers).set(updates).where(eq(accCustomers.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ message: "Customer not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/customers/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    await db.delete(accCustomers).where(eq(accCustomers.id, req.params.id));
    res.json({ success: true });
  });

  // ── Items ───────────────────────────────────────────────────────────────

  app.get("/api/accounting/items", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const items = await db.select().from(accItems).orderBy(accItems.code);
    res.json(items);
  });

  app.post("/api/accounting/items", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const parsed = insertAccItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    const [item] = await db.insert(accItems).values(parsed.data).returning();
    res.json(item);
  });

  app.patch("/api/accounting/items/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const { code, description, defaultPrice, unit, incomeAccountId, isActive } = req.body;
    const updates: Record<string, any> = {};
    if (code !== undefined) updates.code = code;
    if (description !== undefined) updates.description = description;
    if (defaultPrice !== undefined) updates.defaultPrice = defaultPrice;
    if (unit !== undefined) updates.unit = unit;
    if (incomeAccountId !== undefined) updates.incomeAccountId = incomeAccountId;
    if (isActive !== undefined) updates.isActive = isActive;
    const [updated] = await db.update(accItems).set(updates).where(eq(accItems.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ message: "Item not found" });
    res.json(updated);
  });

  app.delete("/api/accounting/items/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    await db.delete(accItems).where(eq(accItems.id, req.params.id));
    res.json({ success: true });
  });

  // ── Finance Dashboard Summary ──────────────────────────────────────────

  app.get("/api/accounting/summary", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    await markOverdueInvoices();
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];

      const [outstandingResult] = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(total AS NUMERIC) - CAST(amount_paid AS NUMERIC)), 0)`
      }).from(accInvoices).where(
        and(
          sql`status NOT IN ('paid', 'void', 'draft')`
        )
      );

      const [overdueResult] = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(total AS NUMERIC) - CAST(amount_paid AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`
      }).from(accInvoices).where(
        and(
          sql`status NOT IN ('paid', 'void', 'draft')`,
          lte(accInvoices.dueDate, today)
        )
      );

      const [collectedResult] = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)`
      }).from(accPaymentsReceived).where(
        gte(accPaymentsReceived.paymentDate, monthStart)
      );

      const [incomeResult] = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(total AS NUMERIC)), 0)`
      }).from(accInvoices).where(
        and(
          sql`status IN ('paid', 'partially_paid')`,
          gte(accInvoices.issueDate, monthStart)
        )
      );

      res.json({
        outstanding: outstandingResult?.total || "0",
        overdue: overdueResult?.total || "0",
        overdueCount: Number(overdueResult?.count || 0),
        collectedThisMonth: collectedResult?.total || "0",
        incomeThisMonth: incomeResult?.total || "0",
      });
    } catch (error) {
      console.error("Error fetching accounting summary:", error);
      res.status(500).json({ message: "Failed to fetch summary" });
    }
  });

  // ── Invoices ────────────────────────────────────────────────────────────

  app.get("/api/accounting/invoices", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    await markOverdueInvoices();
    const { status, customerId, from, to } = req.query;
    const conditions: ReturnType<typeof eq>[] = [];
    if (status && status !== 'all') conditions.push(eq(accInvoices.status, status as string));
    if (customerId) conditions.push(eq(accInvoices.customerId, customerId as string));
    if (from) conditions.push(gte(accInvoices.issueDate, from as string));
    if (to) conditions.push(lte(accInvoices.issueDate, to as string));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const invoices = await db.select().from(accInvoices).where(where).orderBy(desc(accInvoices.createdAt));

    const customerIds = [...new Set(invoices.map(i => i.customerId))];
    const customers = customerIds.length > 0
      ? await db.select().from(accCustomers).where(sql`${accCustomers.id} IN (${sql.join(customerIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

    const enriched = invoices.map(inv => ({
      ...inv,
      customer: customerMap[inv.customerId] || null,
    }));
    res.json(enriched);
  });

  app.get("/api/accounting/invoices/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const [invoice] = await db.select().from(accInvoices).where(eq(accInvoices.id, req.params.id));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const lineItems = await db.select().from(accInvoiceLineItems).where(eq(accInvoiceLineItems.invoiceId, invoice.id));
    const payments = await db.select().from(accPaymentsReceived).where(eq(accPaymentsReceived.invoiceId, invoice.id)).orderBy(desc(accPaymentsReceived.createdAt));
    const creditNotes = await db.select().from(accCreditNotes).where(eq(accCreditNotes.invoiceId, invoice.id)).orderBy(desc(accCreditNotes.createdAt));

    let creditNoteItems: Array<typeof accCreditNoteItems.$inferSelect> = [];
    if (creditNotes.length > 0) {
      const cnIds = creditNotes.map(cn => cn.id);
      creditNoteItems = await db.select().from(accCreditNoteItems).where(sql`${accCreditNoteItems.creditNoteId} IN (${sql.join(cnIds.map(id => sql`${id}`), sql`, `)})`);
    }

    const [customer] = await db.select().from(accCustomers).where(eq(accCustomers.id, invoice.customerId));

    res.json({
      ...invoice,
      customer: customer || null,
      lineItems,
      payments,
      creditNotes: creditNotes.map(cn => ({
        ...cn,
        items: creditNoteItems.filter(item => item.creditNoteId === cn.id),
      })),
    });
  });

  app.post("/api/accounting/invoices", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    try {
      const { lineItems, ...invoiceData } = req.body;
      const regionCode = invoiceData.regionCode || "AU";
      const invoiceNumber = await generateInvoiceNumber(regionCode);

      let subtotal = 0;
      if (lineItems && Array.isArray(lineItems)) {
        subtotal = lineItems.reduce((sum: number, item: { quantity?: string | number; unitPrice?: string | number }) => {
          const qty = parseFloat(String(item.quantity)) || 0;
          const price = parseFloat(String(item.unitPrice)) || 0;
          return sum + qty * price;
        }, 0);
      }

      const gstEnabled = invoiceData.gstEnabled || false;
      const gstAmount = gstEnabled ? subtotal * 0.1 : 0;
      const total = subtotal + gstAmount;

      const [invoice] = await db.insert(accInvoices).values({
        customerId: invoiceData.customerId,
        issueDate: invoiceData.issueDate,
        dueDate: invoiceData.dueDate,
        currency: invoiceData.currency || "AUD",
        gstEnabled,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        regionCode: invoiceData.regionCode || "AU",
        invoiceNumber,
        subtotal: subtotal.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        total: total.toFixed(2),
        status: invoiceData.status || "draft",
      }).returning();

      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        const items = lineItems.map((item: { itemId?: string; description: string; quantity?: string | number; unitPrice?: string | number }) => ({
          invoiceId: invoice.id,
          itemId: item.itemId || null,
          description: item.description,
          quantity: String(item.quantity || 1),
          unitPrice: String(item.unitPrice || 0),
          amount: String((parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0)).toFixed(2)),
        }));
        await db.insert(accInvoiceLineItems).values(items);
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create invoice" });
    }
  });

  app.patch("/api/accounting/invoices/:id", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const { id } = req.params;
    const { lineItems, customerId, issueDate, dueDate, currency, gstEnabled, notes, terms, regionCode, status } = req.body;
    const safeUpdates: Record<string, string | boolean | Date | null> = {};
    if (customerId !== undefined) safeUpdates.customerId = customerId;
    if (issueDate !== undefined) safeUpdates.issueDate = issueDate;
    if (dueDate !== undefined) safeUpdates.dueDate = dueDate;
    if (currency !== undefined) safeUpdates.currency = currency;
    if (gstEnabled !== undefined) safeUpdates.gstEnabled = gstEnabled;
    if (notes !== undefined) safeUpdates.notes = notes;
    if (terms !== undefined) safeUpdates.terms = terms;
    if (regionCode !== undefined) safeUpdates.regionCode = regionCode;
    if (status !== undefined) safeUpdates.status = status;

    if (lineItems && Array.isArray(lineItems)) {
      let subtotal = lineItems.reduce((sum: number, item: { quantity?: string | number; unitPrice?: string | number }) => {
        return sum + (parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0)));
      }, 0);
      const gst = gstEnabled ?? false;
      const gstAmount = gst ? subtotal * 0.1 : 0;
      safeUpdates.subtotal = subtotal.toFixed(2);
      safeUpdates.gstAmount = gstAmount.toFixed(2);
      safeUpdates.total = (subtotal + gstAmount).toFixed(2);

      await db.delete(accInvoiceLineItems).where(eq(accInvoiceLineItems.invoiceId, id));
      if (lineItems.length > 0) {
        const items = lineItems.map((item: { itemId?: string; description: string; quantity?: string | number; unitPrice?: string | number }) => ({
          invoiceId: id,
          itemId: item.itemId || null,
          description: item.description,
          quantity: String(item.quantity || 1),
          unitPrice: String(item.unitPrice || 0),
          amount: String((parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0)).toFixed(2)),
        }));
        await db.insert(accInvoiceLineItems).values(items);
      }
    }

    safeUpdates.updatedAt = new Date();
    const [updated] = await db.update(accInvoices).set(safeUpdates).where(eq(accInvoices.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    res.json(updated);
  });

  // ── Void Invoice ────────────────────────────────────────────────────────

  app.post("/api/accounting/invoices/:id/void", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const [updated] = await db.update(accInvoices)
      .set({ status: "void", updatedAt: new Date() })
      .where(eq(accInvoices.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    res.json(updated);
  });

  // ── Payments ────────────────────────────────────────────────────────────

  app.post("/api/accounting/invoices/:id/payments", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    try {
      const invoiceId = req.params.id;
      const parsed = insertAccPaymentReceivedSchema.safeParse({ ...req.body, invoiceId });
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });

      const [invoice] = await db.select().from(accInvoices).where(eq(accInvoices.id, invoiceId));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const paymentAmount = parseFloat(parsed.data.amount);
      const invoiceTotal = parseFloat(invoice.total);
      const currentPaid = parseFloat(invoice.amountPaid || "0");
      const outstanding = invoiceTotal - currentPaid;

      if (paymentAmount > outstanding + 0.01) {
        return res.status(400).json({ message: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds outstanding balance ($${outstanding.toFixed(2)})` });
      }

      const [payment] = await db.insert(accPaymentsReceived).values(parsed.data).returning();

      const newAmountPaid = Math.min(currentPaid + paymentAmount, invoiceTotal);
      let newStatus: "partially_paid" | "paid" = "partially_paid";
      if (newAmountPaid >= invoiceTotal) newStatus = "paid";

      await db.update(accInvoices).set({
        amountPaid: newAmountPaid.toFixed(2),
        status: newStatus,
        updatedAt: new Date(),
      }).where(eq(accInvoices.id, invoiceId));

      const [customer] = await db.select().from(accCustomers).where(eq(accCustomers.id, invoice.customerId));
      if (customer?.email) {
        sendPaymentReceiptEmail(customer.email, customer.name, invoice.invoiceNumber, parsed.data.amount, parsed.data.method, invoice.regionCode || undefined).catch(err => {
          console.error("Failed to send payment receipt email:", err);
        });
      }

      res.json(payment);
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to record payment" });
    }
  });

  app.get("/api/accounting/invoices/:id/payments", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    const payments = await db.select().from(accPaymentsReceived).where(eq(accPaymentsReceived.invoiceId, req.params.id)).orderBy(desc(accPaymentsReceived.createdAt));
    res.json(payments);
  });

  // ── Credit Notes ────────────────────────────────────────────────────────

  app.post("/api/accounting/invoices/:id/credit-notes", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    try {
      const invoiceId = req.params.id;
      const { items, ...creditNoteData } = req.body;

      const [invoice] = await db.select().from(accInvoices).where(eq(accInvoices.id, invoiceId));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const allowedStatuses = ["sent", "partially_paid", "paid", "overdue"];
      if (!allowedStatuses.includes(invoice.status)) {
        return res.status(400).json({ message: `Cannot issue credit note for invoice with status '${invoice.status}'` });
      }

      const existingCNs = await db.select({ creditNoteNumber: accCreditNotes.creditNoteNumber })
        .from(accCreditNotes)
        .where(eq(accCreditNotes.invoiceId, invoiceId));
      const cnNumber = `CN-${invoice.invoiceNumber}-${existingCNs.length + 1}`;

      let total = 0;
      if (items && Array.isArray(items)) {
        total = items.reduce((sum: number, item: { quantity?: string | number; unitPrice?: string | number }) => {
          return sum + (parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0)));
        }, 0);
      }

      const [creditNote] = await db.insert(accCreditNotes).values({
        invoiceId,
        creditNoteNumber: cnNumber,
        issueDate: creditNoteData.issueDate || new Date().toISOString().split('T')[0],
        total: total.toFixed(2),
        reason: creditNoteData.reason,
      }).returning();

      if (items && Array.isArray(items) && items.length > 0) {
        const cnItems = items.map((item: { description: string; quantity?: string | number; unitPrice?: string | number }) => ({
          creditNoteId: creditNote.id,
          description: item.description,
          quantity: String(item.quantity || 1),
          unitPrice: String(item.unitPrice || 0),
          amount: String((parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0))).toFixed(2)),
        }));
        await db.insert(accCreditNoteItems).values(cnItems);
      }

      if (total > 0) {
        const currentTotal = parseFloat(invoice.total);
        const currentAmountPaid = parseFloat(invoice.amountPaid || "0");
        const newAmountPaid = Math.min(currentAmountPaid + total, currentTotal);
        const invoiceUpdates: Record<string, string | Date> = {
          amountPaid: newAmountPaid.toFixed(2),
          updatedAt: new Date(),
        };
        if (newAmountPaid >= currentTotal) {
          invoiceUpdates.status = "paid";
        }
        await db.update(accInvoices).set(invoiceUpdates).where(eq(accInvoices.id, invoiceId));
      }

      res.json(creditNote);
    } catch (error) {
      console.error("Error creating credit note:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create credit note" });
    }
  });

  // ── Send Invoice Email ──────────────────────────────────────────────────

  app.post("/api/accounting/invoices/:id/send", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    try {
      const [invoice] = await db.select().from(accInvoices).where(eq(accInvoices.id, req.params.id));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const [customer] = await db.select().from(accCustomers).where(eq(accCustomers.id, invoice.customerId));
      if (!customer?.email) return res.status(400).json({ message: "Customer has no email address" });

      const lineItems = await db.select().from(accInvoiceLineItems).where(eq(accInvoiceLineItems.invoiceId, invoice.id));

      await sendInvoiceEmail(customer.email, customer.name, invoice, lineItems, invoice.regionCode || undefined);

      if (invoice.status === 'draft') {
        await db.update(accInvoices).set({ status: 'sent', updatedAt: new Date() }).where(eq(accInvoices.id, invoice.id));
      }

      res.json({ success: true, message: "Invoice sent successfully" });
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to send invoice" });
    }
  });

  // ── Send Invoice Reminder ──────────────────────────────────────────────

  app.post("/api/accounting/invoices/:id/reminder", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    try {
      const [invoice] = await db.select().from(accInvoices).where(eq(accInvoices.id, req.params.id));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const [customer] = await db.select().from(accCustomers).where(eq(accCustomers.id, invoice.customerId));
      if (!customer?.email) return res.status(400).json({ message: "Customer has no email address" });

      await sendInvoiceReminderEmail(customer.email, customer.name, invoice, invoice.regionCode || undefined);
      res.json({ success: true, message: "Reminder sent successfully" });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to send reminder" });
    }
  });
}
