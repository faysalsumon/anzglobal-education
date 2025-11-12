import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileText, CheckCircle2, XCircle, Clock, AlertTriangle, Download, Home } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ParsedCSVRow {
  rowIndex: number;
  isValid: boolean;
  data: any;
  errors: ValidationError[];
}

interface ImportBatch {
  id: string;
  type: 'universities' | 'courses';
  status: 'pending' | 'approved' | 'rejected' | 'failed';
  uploadedBy: string;
  fileName: string;
  rawCsvText: string;
  rawData: ParsedCSVRow[];
  validationErrors: ValidationError[];
  errorCount: number;
  validCount: number;
  importedCount: number;
  totalCount: number;
  notes: string | null;
  createdAt: string;
  processedAt: string | null;
}

export default function AdminCSVImport() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'universities' | 'courses'>('universities');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  // Fetch all import batches
  const { data: batches, isLoading } = useQuery<ImportBatch[]>({
    queryKey: ['/api/admin/csv-import'],
  });

  // Selected batch details
  const selectedBatch = batches?.find(b => b.id === selectedBatchId);

  // Upload CSV mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);

      const response = await fetch('/api/admin/csv-import/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/csv-import'] });
      toast({
        title: "CSV Uploaded Successfully",
        description: `Parsed ${data.totalCount} rows. ${data.validCount} valid, ${data.errorCount} errors.`,
      });
      setSelectedFile(null);
      setSelectedBatchId(data.batchId);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    },
  });

  // Approve batch mutation
  const approveMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return apiRequest("POST", `/api/admin/csv-import/${batchId}/approve`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/csv-import'] });
      toast({
        title: "Import Approved",
        description: `Successfully imported ${data.importedCount} records.`,
      });
      setSelectedBatchId(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error.message,
      });
    },
  });

  // Reject batch mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ batchId, notes }: { batchId: string; notes: string }) => {
      return apiRequest("POST", `/api/admin/csv-import/${batchId}/reject`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/csv-import'] });
      toast({
        title: "Import Rejected",
        description: "The import batch has been rejected.",
      });
      setSelectedBatchId(null);
      setRejectDialogOpen(false);
      setRejectNotes('');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Rejection Failed",
        description: error.message,
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select a CSV file",
      });
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = (type: 'universities' | 'courses') => {
    window.location.href = `/api/admin/csv-import/templates/${type}`;
  };

  const handleApprove = () => {
    if (selectedBatchId) {
      approveMutation.mutate(selectedBatchId);
    }
  };

  const handleReject = () => {
    if (selectedBatchId) {
      rejectMutation.mutate({ batchId: selectedBatchId, notes: rejectNotes });
    }
  };

  const getStatusBadge = (status: ImportBatch['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Failed</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin" data-testid="link-admin-home">
              <Home className="w-4 h-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>CSV Data Import</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bulk Data Import</h1>
        <p className="text-muted-foreground mt-1">Import universities and courses from CSV files</p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload" data-testid="tab-upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Import History</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Select a CSV file to import universities or courses. Download a template to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>Import Type</Label>
                <Select
                  value={importType}
                  onValueChange={(value) => setImportType(value as 'universities' | 'courses')}
                  data-testid="select-import-type"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="universities">Universities</SelectItem>
                    <SelectItem value="courses">Courses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template Download */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadTemplate('universities')}
                  className="gap-2"
                  data-testid="button-download-universities-template"
                >
                  <Download className="w-4 h-4" />
                  Universities Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadTemplate('courses')}
                  className="gap-2"
                  data-testid="button-download-courses-template"
                >
                  <Download className="w-4 h-4" />
                  Courses Template
                </Button>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="csv-upload">CSV File</Label>
                <div className="flex gap-2">
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-1"
                    data-testid="input-csv-file"
                  />
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </p>
                )}
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="w-full gap-2"
                data-testid="button-upload-csv"
              >
                {uploadMutation.isPending ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload and Validate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Validation Results */}
          {selectedBatch && selectedBatch.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Validation Results
                  </span>
                  {getStatusBadge(selectedBatch.status)}
                </CardTitle>
                <CardDescription>
                  File: {selectedBatch.fileName} | {selectedBatch.totalCount} rows total
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedBatch.validCount}</div>
                    <div className="text-sm text-muted-foreground">Valid Rows</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-destructive">{selectedBatch.errorCount}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{selectedBatch.totalCount}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                </div>

                {/* Validation Errors */}
                {selectedBatch.errorCount > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Validation Errors ({selectedBatch.validationErrors.length})
                    </h4>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBatch.validationErrors.slice(0, 50).map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>{error.row}</TableCell>
                              <TableCell><code className="text-sm">{error.field}</code></TableCell>
                              <TableCell className="text-destructive">{error.message}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {error.value ? String(error.value).substring(0, 50) : '(empty)'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {selectedBatch.validationErrors.length > 50 && (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          Showing first 50 of {selectedBatch.validationErrors.length} errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleApprove}
                    disabled={selectedBatch.validCount === 0 || approveMutation.isPending}
                    className="gap-2"
                    data-testid="button-approve-import"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Import {selectedBatch.validCount > 0 ? `(${selectedBatch.validCount} rows)` : ''}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={rejectMutation.isPending}
                    className="gap-2"
                    data-testid="button-reject-import"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>View all past CSV import batches</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : batches && batches.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead>Imported</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.fileName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{batch.type}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(batch.status)}</TableCell>
                          <TableCell>
                            {batch.validCount} / {batch.totalCount}
                            {batch.errorCount > 0 && (
                              <span className="text-destructive ml-1">
                                ({batch.errorCount} errors)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{batch.importedCount}</TableCell>
                          <TableCell>
                            {new Date(batch.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBatchId(batch.id)}
                              data-testid={`button-view-batch-${batch.id}`}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No import batches yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Import Batch</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this import batch (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Rejection reason..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={4}
            data-testid="textarea-reject-notes"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} data-testid="button-confirm-reject">
              Reject Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
