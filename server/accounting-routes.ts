import type { Express, Request, Response } from "express";
import { db } from "./db";
import { isAuthenticated } from "./supabase-middleware";
import { checkAdminAccess, FINANCE_ROLES } from "./routes";
import {
  accChartOfAccounts,
  accCustomers,
  accItems,
  accInvoices,
  accInvoiceLineItems,
  accInvoiceItems,
  accPaymentsReceived,
  accCreditNotes,
  accCreditNoteItems,
  accExpenseCategories,
  accExpenses,
  accBills,
  accBillPayments,
  accReminderLogs,
  universities,
  institutionBusinessTerms,
  studentProfiles,
  users,
  applications,
  courses,
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
import { eq, desc, sql, and, gte, lte, lt, ilike, or } from "drizzle-orm";
import { sendInvoiceEmail, sendPaymentReceiptEmail, sendInvoiceReminderEmail } from "./email-service";

async function requireFinanceAdmin(req: Request, res: Response): Promise<string | null> {
  const userId = (req as any).supabaseUser?.id || (req as any).user?.claims?.sub || (req as any).user?.id;
  if (!userId) { res.status(401).json({ message: "Not authenticated" }); return null; }
  const access = await checkAdminAccess(userId, FINANCE_ROLES);
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
  markOverdueInvoices().catch(err => console.error('[Accounting] Error marking overdue invoices:', err.message));

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

  // ── Search Endpoints (Institution / Student / Enrollment) ─────────────

  app.get("/api/accounting/search/institutions", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    try {
      const q = (req.query.q as string || "").trim();
      const conditions = q ? [ilike(universities.name, `%${q}%`)] : [];
      const results = await db.select({
        id: universities.id,
        name: universities.name,
        logo: universities.logo,
        contactEmail: universities.contactEmail,
        contactPhone: universities.contactPhone,
        country: universities.country,
        campusAddresses: universities.campusAddresses,
        providerType: universities.providerType,
      }).from(universities)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(universities.name)
        .limit(50);

      const institutionIds = results.map(r => r.id);
      let termsMap: Record<string, any> = {};
      if (institutionIds.length > 0) {
        const terms = await db.select().from(institutionBusinessTerms)
          .where(sql`${institutionBusinessTerms.institutionId} IN (${sql.join(institutionIds.map(id => sql`${id}`), sql`, `)})`);
        termsMap = Object.fromEntries(terms.map(t => [t.institutionId, t]));
      }

      const enriched = results.map(inst => ({
        ...inst,
        commissionPercentage: termsMap[inst.id]?.commissionPercentage || null,
        paymentTerms: termsMap[inst.id]?.paymentTerms || null,
        contractStatus: termsMap[inst.id]?.contractStatus || null,
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error searching institutions:", error);
      res.status(500).json({ message: "Failed to search institutions" });
    }
  });

  app.get("/api/accounting/search/students", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    try {
      const q = (req.query.q as string || "").trim();
      const conditions: any[] = [];
      if (q) {
        conditions.push(or(
          ilike(studentProfiles.firstName, `%${q}%`),
          ilike(studentProfiles.lastName, `%${q}%`),
          ilike(users.email, `%${q}%`),
        ));
      }

      const results = await db.select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
        firstName: studentProfiles.firstName,
        lastName: studentProfiles.lastName,
        phone: studentProfiles.phone,
        nationality: studentProfiles.nationality,
        street: studentProfiles.street,
        city: studentProfiles.city,
        state: studentProfiles.state,
        postcode: studentProfiles.postcode,
        country: studentProfiles.country,
        email: users.email,
      }).from(studentProfiles)
        .innerJoin(users, eq(users.id, studentProfiles.userId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(studentProfiles.firstName)
        .limit(50);

      const enriched = results.map(s => ({
        ...s,
        fullName: [s.firstName, s.lastName].filter(Boolean).join(" ") || "Unnamed Student",
        address: [s.street, s.city, s.state, s.postcode, s.country].filter(Boolean).join(", "),
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error searching students:", error);
      res.status(500).json({ message: "Failed to search students" });
    }
  });

  app.get("/api/accounting/search/enrollments", isAuthenticated, async (req, res) => {
    if (!await requireFinanceAdmin(req, res)) return;
    try {
      const q = (req.query.q as string || "").trim();
      const instId = req.query.institutionId as string;
      const studentIdParam = req.query.studentId as string;

      const conditions: any[] = [
        sql`${applications.currentStage} IN ('Offer-Letter', 'GS-Clearance', 'COE', 'Health Cover', 'Visa Lodgment', 'Application Won')`,
      ];
      if (instId) {
        conditions.push(sql`${courses.universityId} = ${instId}`);
      }
      if (studentIdParam) {
        conditions.push(eq(applications.studentId, studentIdParam));
      }
      if (q) {
        conditions.push(or(
          ilike(studentProfiles.firstName, `%${q}%`),
          ilike(studentProfiles.lastName, `%${q}%`),
          ilike(courses.title, `%${q}%`),
        ));
      }

      const results = await db.select({
        applicationId: applications.id,
        applicationNumber: applications.applicationNumber,
        currentStage: applications.currentStage,
        studentId: applications.studentId,
        studentFirstName: studentProfiles.firstName,
        studentLastName: studentProfiles.lastName,
        courseId: courses.id,
        courseName: courses.title,
        universityId: courses.universityId,
        universityName: universities.name,
        tuitionFee: courses.fees,
      }).from(applications)
        .innerJoin(studentProfiles, eq(studentProfiles.id, applications.studentId))
        .leftJoin(courses, eq(courses.id, applications.courseId))
        .leftJoin(universities, eq(universities.id, courses.universityId))
        .where(and(...conditions))
        .orderBy(desc(applications.createdAt))
        .limit(30);

      const universityIds = Array.from(new Set(results.filter(r => r.universityId).map(r => r.universityId!)));
      let termsMap: Record<string, any> = {};
      if (universityIds.length > 0) {
        const terms = await db.select().from(institutionBusinessTerms)
          .where(sql`${institutionBusinessTerms.institutionId} IN (${sql.join(universityIds.map(id => sql`${id}`), sql`, `)})`);
        termsMap = Object.fromEntries(terms.map(t => [t.institutionId, t]));
      }

      const enriched = results.map(r => ({
        ...r,
        studentName: [r.studentFirstName, r.studentLastName].filter(Boolean).join(" "),
        commissionPercentage: r.universityId ? (termsMap[r.universityId]?.commissionPercentage || null) : null,
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error searching enrollments:", error);
      res.status(500).json({ message: "Failed to search enrollments" });
    }
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
    const conditions: any[] = [];
    if (status && status !== 'all') conditions.push(eq(accInvoices.status, status as any));
    if (customerId) conditions.push(eq(accInvoices.customerId, customerId as string));
    if (from) conditions.push(gte(accInvoices.issueDate, from as string));
    if (to) conditions.push(lte(accInvoices.issueDate, to as string));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const invoices = await db.select().from(accInvoices).where(where).orderBy(desc(accInvoices.createdAt));

    const customerIds = Array.from(new Set(invoices.map(i => i.customerId)));
    const customers = customerIds.length > 0
      ? await db.select().from(accCustomers).where(sql`${accCustomers.id} IN (${sql.join(customerIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

    const instIds = Array.from(new Set(invoices.filter(i => i.institutionId).map(i => i.institutionId!)));
    let institutionMap: Record<string, any> = {};
    if (instIds.length > 0) {
      const insts = await db.select({ id: universities.id, name: universities.name, logo: universities.logo })
        .from(universities).where(sql`${universities.id} IN (${sql.join(instIds.map(id => sql`${id}`), sql`, `)})`);
      institutionMap = Object.fromEntries(insts.map(i => [i.id, i]));
    }

    const studIds = Array.from(new Set(invoices.filter(i => i.studentId).map(i => i.studentId!)));
    let studentMap: Record<string, any> = {};
    if (studIds.length > 0) {
      const studs = await db.select({
        id: studentProfiles.id, firstName: studentProfiles.firstName, lastName: studentProfiles.lastName, email: users.email,
      }).from(studentProfiles).innerJoin(users, eq(users.id, studentProfiles.userId))
        .where(sql`${studentProfiles.id} IN (${sql.join(studIds.map(id => sql`${id}`), sql`, `)})`);
      studentMap = Object.fromEntries(studs.map(s => [s.id, { ...s, fullName: [s.firstName, s.lastName].filter(Boolean).join(" ") }]));
    }

    const enriched = invoices.map(inv => ({
      ...inv,
      customer: customerMap[inv.customerId] || null,
      institution: inv.institutionId ? (institutionMap[inv.institutionId] || null) : null,
      student: inv.studentId ? (studentMap[inv.studentId] || null) : null,
      clientName: inv.billToType === "institution" && inv.institutionId
        ? (institutionMap[inv.institutionId]?.name || customerMap[inv.customerId]?.name || "Unknown")
        : inv.billToType === "student" && inv.studentId
        ? (studentMap[inv.studentId]?.fullName || customerMap[inv.customerId]?.name || "Unknown")
        : (customerMap[inv.customerId]?.name || "Unknown"),
      clientEmail: customerMap[inv.customerId]?.email || null,
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

    let institution = null;
    if (invoice.institutionId) {
      const [inst] = await db.select({ id: universities.id, name: universities.name, logo: universities.logo, contactEmail: universities.contactEmail, contactPhone: universities.contactPhone, country: universities.country })
        .from(universities).where(eq(universities.id, invoice.institutionId));
      institution = inst || null;
    }

    let student = null;
    if (invoice.studentId) {
      const [stud] = await db.select({
        id: studentProfiles.id, firstName: studentProfiles.firstName, lastName: studentProfiles.lastName,
        email: users.email, phone: studentProfiles.phone, nationality: studentProfiles.nationality,
      }).from(studentProfiles).innerJoin(users, eq(users.id, studentProfiles.userId))
        .where(eq(studentProfiles.id, invoice.studentId));
      if (stud) student = { ...stud, fullName: [stud.firstName, stud.lastName].filter(Boolean).join(" ") };
    }

    const clientName = invoice.billToType === "institution" ? (institution?.name || customer?.name || "Unknown")
      : invoice.billToType === "student" ? (student?.fullName || customer?.name || "Unknown")
      : (customer?.name || "Unknown");

    res.json({
      ...invoice,
      customer: customer || null,
      institution,
      student,
      clientName,
      clientEmail: customer?.email || null,
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

      if (!invoiceData.issueDate || !invoiceData.dueDate) {
        return res.status(400).json({ message: "Issue date and due date are required" });
      }
      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        return res.status(400).json({ message: "At least one line item is required" });
      }
      if (lineItems.some((li: any) => !li.description)) {
        return res.status(400).json({ message: "All line items must have a description" });
      }

      const billToType = invoiceData.billToType || "manual";
      if (!["institution", "student", "manual"].includes(billToType)) {
        return res.status(400).json({ message: "Invalid billToType. Must be institution, student, or manual" });
      }
      if (billToType === "institution" && !invoiceData.institutionId) {
        return res.status(400).json({ message: "institutionId is required when billToType is institution" });
      }
      if (billToType === "student" && !invoiceData.studentId) {
        return res.status(400).json({ message: "studentId is required when billToType is student" });
      }
      if (billToType === "manual" && !invoiceData.clientName) {
        return res.status(400).json({ message: "clientName is required when billToType is manual" });
      }

      const regionCode = invoiceData.regionCode || "AU";
      const invoiceNumber = await generateInvoiceNumber(regionCode);

      let customerId = invoiceData.customerId;

      if (!customerId) {
        const customerData: any = {
          name: invoiceData.clientName || "Unknown",
          email: invoiceData.clientEmail || null,
          phone: invoiceData.clientPhone || null,
          address: invoiceData.clientAddress || null,
          currency: invoiceData.currency || "AUD",
        };

        if (billToType === "institution" && invoiceData.institutionId) {
          customerData.institutionId = invoiceData.institutionId;
          const [existing] = await db.select().from(accCustomers)
            .where(eq(accCustomers.institutionId, invoiceData.institutionId)).limit(1);
          if (existing) {
            customerId = existing.id;
            await db.update(accCustomers).set({
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone,
              address: customerData.address,
            }).where(eq(accCustomers.id, existing.id));
          }
        } else if (billToType === "student" && invoiceData.studentId) {
          customerData.studentId = invoiceData.studentId;
          const [existing] = await db.select().from(accCustomers)
            .where(eq(accCustomers.studentId, invoiceData.studentId)).limit(1);
          if (existing) {
            customerId = existing.id;
            await db.update(accCustomers).set({
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone,
              address: customerData.address,
            }).where(eq(accCustomers.id, existing.id));
          }
        }

        if (!customerId) {
          const [newCustomer] = await db.insert(accCustomers).values(customerData).returning();
          customerId = newCustomer.id;
        }
      }

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
        customerId,
        billToType,
        institutionId: billToType === "institution" ? (invoiceData.institutionId || null) : null,
        studentId: billToType === "student" ? (invoiceData.studentId || null) : null,
        applicationId: invoiceData.applicationId || null,
        accountId: invoiceData.accountId || null,
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
        clientTaxRef: invoiceData.clientTaxRef || null,
      }).returning();

      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        const items = lineItems.map((item: { itemId?: string; description: string; quantity?: string | number; unitPrice?: string | number }) => ({
          invoiceId: invoice.id,
          itemId: item.itemId || null,
          description: item.description,
          quantity: String(item.quantity || 1),
          unitPrice: String(item.unitPrice || 0),
          amount: String((parseFloat(String(item.quantity) || "1") * parseFloat(String(item.unitPrice) || "0")).toFixed(2)),
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
    const { lineItems, customerId, issueDate, dueDate, currency, gstEnabled, notes, terms, regionCode, status,
      billToType, institutionId, studentId, applicationId, clientName, clientEmail, clientPhone, clientAddress, accountId, clientTaxRef } = req.body;

    if (billToType !== undefined) {
      if (!["institution", "student", "manual"].includes(billToType)) {
        return res.status(400).json({ message: "Invalid billToType. Must be institution, student, or manual" });
      }
      if (billToType === "institution" && !institutionId) {
        return res.status(400).json({ message: "institutionId is required when billToType is institution" });
      }
      if (billToType === "student" && !studentId) {
        return res.status(400).json({ message: "studentId is required when billToType is student" });
      }
    }

    const safeUpdates: Record<string, string | boolean | Date | null> = {};
    if (customerId !== undefined) safeUpdates.customerId = customerId;
    if (billToType !== undefined) safeUpdates.billToType = billToType;
    if (billToType !== undefined) {
      safeUpdates.institutionId = billToType === "institution" ? (institutionId || null) : null;
      safeUpdates.studentId = billToType === "student" ? (studentId || null) : null;
      safeUpdates.applicationId = applicationId || null;
    } else {
      if (institutionId !== undefined) safeUpdates.institutionId = institutionId;
      if (studentId !== undefined) safeUpdates.studentId = studentId;
      if (applicationId !== undefined) safeUpdates.applicationId = applicationId;
    }
    if (issueDate !== undefined) safeUpdates.issueDate = issueDate;
    if (dueDate !== undefined) safeUpdates.dueDate = dueDate;
    if (currency !== undefined) safeUpdates.currency = currency;
    if (gstEnabled !== undefined) safeUpdates.gstEnabled = gstEnabled;
    if (notes !== undefined) safeUpdates.notes = notes;
    if (terms !== undefined) safeUpdates.terms = terms;
    if (regionCode !== undefined) safeUpdates.regionCode = regionCode;
    if (status !== undefined) safeUpdates.status = status;
    if (accountId !== undefined) safeUpdates.accountId = accountId || null;
    if (clientTaxRef !== undefined) safeUpdates.clientTaxRef = clientTaxRef || null;

    if (lineItems && Array.isArray(lineItems)) {
      const subtotal = lineItems.reduce((sum: number, item: { quantity?: string | number; unitPrice?: string | number }) => {
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
          amount: String((parseFloat(String(item.quantity || 1)) * parseFloat(String(item.unitPrice || 0))).toFixed(2)),
        }));
        await db.insert(accInvoiceLineItems).values(items);
      }
    }

    // Sync acc_customers when client contact fields are provided
    if (clientName !== undefined || clientEmail !== undefined || clientPhone !== undefined || clientAddress !== undefined) {
      const [existingInv] = await db.select({ customerId: accInvoices.customerId }).from(accInvoices).where(eq(accInvoices.id, id));
      if (existingInv?.customerId) {
        const customerUpdates: Record<string, string | null> = {};
        if (clientName !== undefined) customerUpdates.name = clientName;
        if (clientEmail !== undefined) customerUpdates.email = clientEmail;
        if (clientPhone !== undefined) customerUpdates.phone = clientPhone;
        if (clientAddress !== undefined) customerUpdates.address = clientAddress;
        if (Object.keys(customerUpdates).length > 0) {
          await db.update(accCustomers).set(customerUpdates).where(eq(accCustomers.id, existingInv.customerId));
        }
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

      await sendInvoiceEmail(customer.email, customer.name, invoice as any, lineItems as any, invoice.regionCode || undefined);

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

      await sendInvoiceReminderEmail(customer.email, customer.name, invoice as any, invoice.regionCode || undefined);
      res.json({ success: true, message: "Reminder sent successfully" });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to send reminder" });
    }
  });

  // ── Expense Categories ────────────────────────────────────────────────

  app.get("/api/accounting/expense-categories", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const categories = await db.select().from(accExpenseCategories).orderBy(accExpenseCategories.name);
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/expenses", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const expenses = await db.select().from(accExpenses).orderBy(desc(accExpenses.expenseDate));
      res.json(expenses);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/accounting/expenses", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const [expense] = await db.insert(accExpenses).values({
        ...req.body,
        amount: String(req.body.amount),
        createdBy: userId,
      }).returning();
      res.status(201).json(expense);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/accounting/expenses/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const id = parseInt(req.params.id);
      const updateData = { ...req.body };
      if (updateData.amount) updateData.amount = String(updateData.amount);
      const [updated] = await db.update(accExpenses).set(updateData).where(eq(accExpenses.id, id)).returning();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/accounting/expenses/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const id = parseInt(req.params.id);
      await db.delete(accExpenses).where(eq(accExpenses.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== BILLS ====================

  app.get("/api/accounting/bills", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const bills = await db.select().from(accBills).orderBy(desc(accBills.createdAt));
      
      const enriched = await Promise.all(bills.map(async (bill) => {
        const payments = await db.select().from(accBillPayments).where(eq(accBillPayments.billId, bill.id));
        const amountPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
        const isOverdue = bill.status !== 'paid' && new Date(bill.dueDate) < new Date();
        return { ...bill, payments, amountPaid, amountDue: parseFloat(bill.amount) - amountPaid, isOverdue };
      }));

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/accounting/bills", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const [bill] = await db.insert(accBills).values({
        ...req.body,
        amount: String(req.body.amount),
        createdBy: userId,
      }).returning();
      res.status(201).json(bill);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/accounting/bills/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const id = parseInt(req.params.id);
      const updateData = { ...req.body };
      if (updateData.amount) updateData.amount = String(updateData.amount);
      const [updated] = await db.update(accBills).set(updateData).where(eq(accBills.id, id)).returning();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/accounting/bills/:id/pay", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const billId = parseInt(req.params.id);
      const [bill] = await db.select().from(accBills).where(eq(accBills.id, billId));
      if (!bill) return res.status(404).json({ message: "Bill not found" });

      const [payment] = await db.insert(accBillPayments).values({
        billId,
        amount: String(req.body.amount),
        paidOn: req.body.paidOn || new Date().toISOString().split("T")[0],
        method: req.body.method,
        reference: req.body.reference,
        notes: req.body.notes,
      }).returning();

      const allPayments = await db.select().from(accBillPayments).where(eq(accBillPayments.billId, billId));
      const totalPaid = allPayments.reduce((s, p) => s + parseFloat(p.amount), 0);

      let newStatus: "unpaid" | "partially_paid" | "paid" = "unpaid";
      if (totalPaid >= parseFloat(bill.amount)) newStatus = "paid";
      else if (totalPaid > 0) newStatus = "partially_paid";

      await db.update(accBills).set({ status: newStatus }).where(eq(accBills.id, billId));

      res.json({ payment, newStatus });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/accounting/bills/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const id = parseInt(req.params.id);
      await db.delete(accBills).where(eq(accBills.id, id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== REPORTS ====================

  app.get("/api/accounting/reports/profit-loss", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
      const endDate = (req.query.endDate as string) || new Date().toISOString().split("T")[0];

      const revenueResult = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accPaymentsReceived)
        .where(and(gte(accPaymentsReceived.paymentDate, startDate), lte(accPaymentsReceived.paymentDate, endDate)));

      const expenseResult = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accExpenses)
        .where(and(gte(accExpenses.expenseDate, startDate), lte(accExpenses.expenseDate, endDate)));

      const billPaidResult = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accBillPayments)
        .where(and(gte(accBillPayments.paidOn, startDate), lte(accBillPayments.paidOn, endDate)));

      const expensesByCategory = await db.select({
        categoryId: accExpenses.categoryId,
        total: sql<string>`SUM(${accExpenses.amount})`,
      }).from(accExpenses)
        .where(and(gte(accExpenses.expenseDate, startDate), lte(accExpenses.expenseDate, endDate)))
        .groupBy(accExpenses.categoryId);

      const categories = await db.select().from(accExpenseCategories);
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      const revenue = parseFloat(revenueResult[0]?.total || "0");
      const expenses = parseFloat(expenseResult[0]?.total || "0") + parseFloat(billPaidResult[0]?.total || "0");

      res.json({
        period: { startDate, endDate },
        revenue,
        expenses,
        netProfit: revenue - expenses,
        expensesByCategory: expensesByCategory.map(e => ({
          category: categoryMap.get(e.categoryId!) || "Uncategorized",
          total: parseFloat(e.total),
        })),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/reports/balance-sheet", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const asOfDate = (req.query.asOfDate as string) || new Date().toISOString().split("T")[0];

      const [arResult] = await db.select({
        totalInvoiced: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accInvoiceItems);

      const [arPaidResult] = await db.select({
        totalPaid: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accPaymentsReceived)
        .where(lte(accPaymentsReceived.paymentDate, asOfDate));

      const [cashIn] = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accPaymentsReceived)
        .where(lte(accPaymentsReceived.paymentDate, asOfDate));

      const [cashOutExpenses] = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accExpenses)
        .where(lte(accExpenses.expenseDate, asOfDate));

      const [cashOutBills] = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accBillPayments)
        .where(lte(accBillPayments.paidOn, asOfDate));

      const [apResult] = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accBills)
        .where(and(
          sql`${accBills.status} != 'paid'`,
          lte(accBills.issueDate, asOfDate)
        ));

      const [apPaid] = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      }).from(accBillPayments)
        .where(lte(accBillPayments.paidOn, asOfDate));

      const accountsReceivable = parseFloat(arResult?.totalInvoiced || "0") - parseFloat(arPaidResult?.totalPaid || "0");
      const cashBalance = parseFloat(cashIn?.total || "0") - parseFloat(cashOutExpenses?.total || "0") - parseFloat(cashOutBills?.total || "0");
      const accountsPayable = parseFloat(apResult?.total || "0") - parseFloat(apPaid?.total || "0");

      const totalAssets = cashBalance + Math.max(0, accountsReceivable);
      const totalLiabilities = Math.max(0, accountsPayable);
      const equity = totalAssets - totalLiabilities;

      res.json({
        asOfDate,
        assets: {
          cash: cashBalance,
          accountsReceivable: Math.max(0, accountsReceivable),
          total: totalAssets,
        },
        liabilities: {
          accountsPayable: Math.max(0, accountsPayable),
          total: totalLiabilities,
        },
        equity,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/reports/cash-flow", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const months: { month: string; moneyIn: number; moneyOut: number }[] = [];

      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const month = d.getMonth();
        const startDate = new Date(year, month, 1).toISOString().split("T")[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

        const [moneyInResult] = await db.select({
          total: sql<string>`COALESCE(SUM(amount), 0)`
        }).from(accPaymentsReceived)
          .where(and(gte(accPaymentsReceived.paymentDate, startDate), lte(accPaymentsReceived.paymentDate, endDate)));

        const [expenseOut] = await db.select({
          total: sql<string>`COALESCE(SUM(amount), 0)`
        }).from(accExpenses)
          .where(and(gte(accExpenses.expenseDate, startDate), lte(accExpenses.expenseDate, endDate)));

        const [billOut] = await db.select({
          total: sql<string>`COALESCE(SUM(amount), 0)`
        }).from(accBillPayments)
          .where(and(gte(accBillPayments.paidOn, startDate), lte(accBillPayments.paidOn, endDate)));

        months.push({
          month: label,
          moneyIn: parseFloat(moneyInResult?.total || "0"),
          moneyOut: parseFloat(expenseOut?.total || "0") + parseFloat(billOut?.total || "0"),
        });
      }

      res.json(months);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/reports/ar-aging", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const invoices = await db.select().from(accInvoices)
        .where(sql`${accInvoices.status} NOT IN ('paid', 'cancelled', 'draft')`);

      const buckets = { current: [] as any[], "31-60": [] as any[], "61-90": [] as any[], "90+": [] as any[] };
      const now = new Date();

      for (const inv of invoices) {
        const items = await db.select().from(accInvoiceItems).where(eq(accInvoiceItems.invoiceId, inv.id));
        const payments = await db.select().from(accPaymentsReceived).where(eq(accPaymentsReceived.invoiceId, inv.id));
        const total = items.reduce((s, i) => s + parseFloat(i.amount), 0);
        const paid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
        const balance = total - paid;
        if (balance <= 0) continue;

        const dueDate = new Date(inv.dueDate);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        const entry = { ...inv, total, amountPaid: paid, balance, daysOverdue };

        if (daysOverdue <= 30) buckets.current.push(entry);
        else if (daysOverdue <= 60) buckets["31-60"].push(entry);
        else if (daysOverdue <= 90) buckets["61-90"].push(entry);
        else buckets["90+"].push(entry);
      }

      res.json({
        buckets,
        totals: {
          current: buckets.current.reduce((s, e) => s + e.balance, 0),
          "31-60": buckets["31-60"].reduce((s, e) => s + e.balance, 0),
          "61-90": buckets["61-90"].reduce((s, e) => s + e.balance, 0),
          "90+": buckets["90+"].reduce((s, e) => s + e.balance, 0),
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/reports/ap-aging", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const bills = await db.select().from(accBills)
        .where(sql`${accBills.status} != 'paid'`);

      const buckets = { current: [] as any[], "31-60": [] as any[], "61-90": [] as any[], "90+": [] as any[] };
      const now = new Date();

      for (const bill of bills) {
        const payments = await db.select().from(accBillPayments).where(eq(accBillPayments.billId, bill.id));
        const paid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
        const balance = parseFloat(bill.amount) - paid;
        if (balance <= 0) continue;

        const dueDate = new Date(bill.dueDate);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        const entry = { ...bill, amountPaid: paid, balance, daysOverdue };

        if (daysOverdue <= 30) buckets.current.push(entry);
        else if (daysOverdue <= 60) buckets["31-60"].push(entry);
        else if (daysOverdue <= 90) buckets["61-90"].push(entry);
        else buckets["90+"].push(entry);
      }

      res.json({
        buckets,
        totals: {
          current: buckets.current.reduce((s, e) => s + e.balance, 0),
          "31-60": buckets["31-60"].reduce((s, e) => s + e.balance, 0),
          "61-90": buckets["61-90"].reduce((s, e) => s + e.balance, 0),
          "90+": buckets["90+"].reduce((s, e) => s + e.balance, 0),
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== OVERDUE REMINDERS ====================

  app.post("/api/accounting/invoices/send-overdue-reminders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId, ["cto"]);
      if (!access) return res.status(403).json({ message: "CTO access required" });

      const today = new Date().toISOString().split("T")[0];
      const overdueInvoices = await db.select().from(accInvoices)
        .where(and(
          sql`${accInvoices.status} NOT IN ('paid', 'cancelled', 'draft')`,
          lt(accInvoices.dueDate, today)
        ));

      let sentCount = 0;
      const results: any[] = [];

      for (const inv of overdueInvoices) {
        const [customer] = inv.customerId
          ? await db.select().from(accCustomers).where(eq(accCustomers.id, inv.customerId))
          : [];
        if (!customer?.email) continue;

        const items = await db.select().from(accInvoiceLineItems).where(eq(accInvoiceLineItems.invoiceId, inv.id));
        const payments = await db.select().from(accPaymentsReceived).where(eq(accPaymentsReceived.invoiceId, inv.id));
        const total = items.reduce((s, i) => s + parseFloat(i.amount), 0);
        const paid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
        const balance = total - paid;
        if (balance <= 0) continue;

        await db.insert(accReminderLogs).values({
          invoiceId: inv.id as any,
          sentTo: customer.email,
          triggeredBy: userId,
        });

        results.push({
          invoiceNumber: inv.invoiceNumber,
          clientName: customer.name,
          clientEmail: customer.email,
          balance,
        });
        sentCount++;
      }

      res.json({ sentCount, results });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/reminder-logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const access = await checkAdminAccess(userId);
      if (!access) return res.status(403).json({ message: "Forbidden" });

      const logs = await db.select().from(accReminderLogs).orderBy(desc(accReminderLogs.sentAt)).limit(50);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  console.log("Accounting routes registered");
}
