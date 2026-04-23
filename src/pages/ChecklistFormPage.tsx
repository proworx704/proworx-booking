import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Send,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUserRole } from "@/contexts/RoleContext";

type Response = {
  sectionIndex: number;
  itemIndex: number;
  checked: boolean;
  passFail?: "pass" | "fail" | "na";
  note?: string;
};

type PendingImage = {
  file: File;
  preview: string;
  type: "before" | "after";
};

export function ChecklistFormPage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const templates = useQuery(api.checklists.listTemplates);
  const createSubmission = useMutation(api.checklists.createSubmission);
  const generateUploadUrl = useMutation(api.checklists.generateImageUploadUrl);
  const saveImage = useMutation(api.checklists.saveChecklistImage);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const selectedTemplate = templates?.find((t) => t._id === selectedTemplateId);

  // Client info
  const [customerName, setCustomerName] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [jobDate, setJobDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Checklist responses
  const [responses, setResponses] = useState<Map<string, Response>>(new Map());

  // Images
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImageType, setUploadingImageType] = useState<"before" | "after">("before");

  const [submitting, setSubmitting] = useState(false);

  const getKey = (si: number, ii: number) => `${si}-${ii}`;

  const toggleCheck = (sectionIndex: number, itemIndex: number) => {
    const key = getKey(sectionIndex, itemIndex);
    setResponses((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      next.set(key, {
        sectionIndex,
        itemIndex,
        checked: !existing?.checked,
        passFail: existing?.passFail,
        note: existing?.note,
      });
      return next;
    });
  };

  const setPassFail = (sectionIndex: number, itemIndex: number, value: "pass" | "fail" | "na") => {
    const key = getKey(sectionIndex, itemIndex);
    setResponses((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      next.set(key, {
        sectionIndex,
        itemIndex,
        checked: value === "pass",
        passFail: value,
        note: existing?.note,
      });
      return next;
    });
  };

  const handleImageSelect = (type: "before" | "after") => {
    setUploadingImageType(type);
    fileInputRef.current?.click();
  };

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: PendingImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        type: uploadingImageType,
      });
    }
    setPendingImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => {
      const img = prev[index];
      URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Calculate completion
  const totalItems = selectedTemplate
    ? selectedTemplate.sections.reduce((sum, s) => sum + s.items.length, 0)
    : 0;
  const checkedItems = Array.from(responses.values()).filter(
    (r) => r.checked || r.passFail === "pass" || r.passFail === "na"
  ).length;
  const failedItems = Array.from(responses.values()).filter(
    (r) => r.passFail === "fail"
  ).length;
  const overallResult: "pass" | "fail" = failedItems > 0 ? "fail" : "pass";

  const canSubmit =
    selectedTemplate &&
    customerName.trim() &&
    vehicleMake.trim() &&
    vehicleModel.trim() &&
    jobDate;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedTemplate) return;
    setSubmitting(true);

    try {
      // Build responses array
      const allResponses: Response[] = [];
      for (let si = 0; si < selectedTemplate.sections.length; si++) {
        for (let ii = 0; ii < selectedTemplate.sections[si].items.length; ii++) {
          const key = getKey(si, ii);
          const resp = responses.get(key);
          allResponses.push({
            sectionIndex: si,
            itemIndex: ii,
            checked: resp?.checked ?? false,
            passFail: resp?.passFail,
            note: resp?.note,
          });
        }
      }

      // Create submission
      const submissionId = await createSubmission({
        templateId: selectedTemplate._id as Id<"checklistTemplates">,
        customerName: customerName.trim(),
        vehicleYear: vehicleYear || undefined,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleColor: vehicleColor || undefined,
        licensePlate: licensePlate || undefined,
        jobDate,
        notes: notes || undefined,
        responses: allResponses,
        overallResult,
      });

      // Upload images
      for (const img of pendingImages) {
        try {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": img.file.type },
            body: img.file,
          });
          const { storageId } = await result.json();
          await saveImage({
            submissionId,
            storageId,
            type: img.type,
          });
        } catch (err) {
          console.error("Image upload failed:", err);
        }
      }

      toast.success("Checklist submitted for review!");
      navigate(isAdmin ? "/checklists" : "/my/checklists");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isAdmin ? "/checklists" : "/my/checklists"}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">New QC Checklist</h1>
          <p className="text-sm text-muted-foreground">Fill out after completing a job</p>
        </div>
      </div>

      {/* Template Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Service Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select checklist type..." />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Client Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Client & Vehicle Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Customer Name *</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Year</Label>
              <Input
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder="2024"
              />
            </div>
            <div>
              <Label>Make *</Label>
              <Input
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="Toyota"
              />
            </div>
            <div>
              <Label>Model *</Label>
              <Input
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Camry"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Color</Label>
              <Input
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder="Black"
              />
            </div>
            <div>
              <Label>License Plate</Label>
              <Input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="ABC-1234"
              />
            </div>
            <div>
              <Label>Job Date *</Label>
              <Input
                type="date"
                value={jobDate}
                onChange={(e) => setJobDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      {selectedTemplate && (
        <>
          {/* Progress */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
            <span className="text-sm font-medium">
              Progress: {checkedItems} / {totalItems} items
            </span>
            <div className="flex items-center gap-2">
              {failedItems > 0 && (
                <Badge variant="destructive">{failedItems} Failed</Badge>
              )}
              <Badge className={overallResult === "pass" ? "bg-emerald-600" : "bg-red-600"}>
                {overallResult.toUpperCase()}
              </Badge>
            </div>
          </div>

          {selectedTemplate.sections.map((section, si) => (
            <Card key={si}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {si + 1}
                  </span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {section.items.map((item, ii) => {
                  const key = getKey(si, ii);
                  const resp = responses.get(key);
                  return (
                    <div
                      key={ii}
                      className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-accent/40 transition-colors"
                    >
                      {item.type === "check" ? (
                        <Checkbox
                          checked={resp?.checked ?? false}
                          onCheckedChange={() => toggleCheck(si, ii)}
                          className="size-5"
                        />
                      ) : (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setPassFail(si, ii, "pass")}
                            className={`px-2 py-0.5 text-xs font-medium rounded border transition-colors ${
                              resp?.passFail === "pass"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "border-border hover:bg-emerald-50 hover:border-emerald-300"
                            }`}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => setPassFail(si, ii, "fail")}
                            className={`px-2 py-0.5 text-xs font-medium rounded border transition-colors ${
                              resp?.passFail === "fail"
                                ? "bg-red-600 text-white border-red-600"
                                : "border-border hover:bg-red-50 hover:border-red-300"
                            }`}
                          >
                            Fail
                          </button>
                          <button
                            type="button"
                            onClick={() => setPassFail(si, ii, "na")}
                            className={`px-2 py-0.5 text-xs font-medium rounded border transition-colors ${
                              resp?.passFail === "na"
                                ? "bg-gray-500 text-white border-gray-500"
                                : "border-border hover:bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            N/A
                          </button>
                        </div>
                      )}
                      <span
                        className={`text-sm flex-1 ${
                          resp?.checked || resp?.passFail === "pass" || resp?.passFail === "na"
                            ? "text-muted-foreground line-through"
                            : resp?.passFail === "fail"
                              ? "text-red-600 font-medium"
                              : ""
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Images */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="size-4" />
            Before & After Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesChosen}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Before</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageSelect("before")}
                >
                  <Upload className="size-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {pendingImages
                  .filter((img) => img.type === "before")
                  .map((img, i) => {
                    const globalIndex = pendingImages.indexOf(img);
                    return (
                      <div key={i} className="relative group rounded-lg overflow-hidden border">
                        <img
                          src={img.preview}
                          alt="Before"
                          className="w-full h-32 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(globalIndex)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                {pendingImages.filter((img) => img.type === "before").length === 0 && (
                  <button
                    type="button"
                    onClick={() => handleImageSelect("before")}
                    className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Camera className="size-5 mb-1" />
                    <span className="text-xs">Tap to add</span>
                  </button>
                )}
              </div>
            </div>

            {/* After */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">After</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageSelect("after")}
                >
                  <Upload className="size-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {pendingImages
                  .filter((img) => img.type === "after")
                  .map((img, i) => {
                    const globalIndex = pendingImages.indexOf(img);
                    return (
                      <div key={i} className="relative group rounded-lg overflow-hidden border">
                        <img
                          src={img.preview}
                          alt="After"
                          className="w-full h-32 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(globalIndex)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                {pendingImages.filter((img) => img.type === "after").length === 0 && (
                  <button
                    type="button"
                    onClick={() => handleImageSelect("after")}
                    className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Camera className="size-5 mb-1" />
                    <span className="text-xs">Tap to add</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about this job..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="sticky bottom-0 bg-background border-t py-4 -mx-4 px-4 lg:-mx-6 lg:px-6">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 mr-2 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="size-5 mr-2" /> Submit for Approval
            </>
          )}
        </Button>
        {!canSubmit && selectedTemplate && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Fill in customer name, vehicle make & model, and date to submit
          </p>
        )}
      </div>
    </div>
  );
}
