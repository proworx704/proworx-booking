import { useQuery, useMutation } from "convex/react";
import { Save, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PayrollTaxSettingsPage() {
  const settings = useQuery(api.payrollTaxSettings.get);
  const defaults = useQuery(api.payrollTaxSettings.getDefaults);
  const upsert = useMutation(api.payrollTaxSettings.upsert);

  const [federalRate, setFederalRate] = useState("");
  const [stateRate, setStateRate] = useState("");
  const [ssRate, setSsRate] = useState("");
  const [medicareRate, setMedicareRate] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    if (settings !== undefined && defaults) {
      const s = settings ?? defaults;
      setFederalRate(String(s.federalRate));
      setStateRate(String(s.stateRate));
      setSsRate(String(s.socialSecurityRate));
      setMedicareRate(String(s.medicareRate));
      setLoaded(true);
    }
  }, [settings, defaults, loaded]);

  const totalRate =
    (Number.parseFloat(federalRate) || 0) +
    (Number.parseFloat(stateRate) || 0) +
    (Number.parseFloat(ssRate) || 0) +
    (Number.parseFloat(medicareRate) || 0);

  const handleSave = async () => {
    const fed = Number.parseFloat(federalRate);
    const state = Number.parseFloat(stateRate);
    const ss = Number.parseFloat(ssRate);
    const med = Number.parseFloat(medicareRate);
    if ([fed, state, ss, med].some((v) => Number.isNaN(v) || v < 0 || v > 100)) {
      toast.error("All rates must be between 0 and 100");
      return;
    }
    await upsert({
      federalRate: fed,
      stateRate: state,
      socialSecurityRate: ss,
      medicareRate: med,
    });
    toast.success("Tax settings saved");
  };

  const handleReset = () => {
    if (defaults) {
      setFederalRate(String(defaults.federalRate));
      setStateRate(String(defaults.stateRate));
      setSsRate(String(defaults.socialSecurityRate));
      setMedicareRate(String(defaults.medicareRate));
    }
  };

  const exampleGross = 600;
  const exampleNet = exampleGross * (1 - totalRate / 100);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax Settings</h1>
        <p className="text-muted-foreground">
          Configure payroll tax withholding rates. These apply to all payout calculations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withholding Rates</CardTitle>
          <CardDescription>
            Set the percentage withheld from each worker's gross pay. Changes apply to newly generated payouts only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="federal">Federal Income Tax (%)</Label>
              <Input
                id="federal"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={federalRate}
                onChange={(e) => setFederalRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Simplified flat rate. Default: 10%</p>
            </div>
            <div>
              <Label htmlFor="state">NC State Income Tax (%)</Label>
              <Input
                id="state"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={stateRate}
                onChange={(e) => setStateRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">NC flat state tax. Default: 4.5%</p>
            </div>
            <div>
              <Label htmlFor="ss">Social Security (%)</Label>
              <Input
                id="ss"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={ssRate}
                onChange={(e) => setSsRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">FICA employee share. Default: 6.2%</p>
            </div>
            <div>
              <Label htmlFor="medicare">Medicare (%)</Label>
              <Input
                id="medicare"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={medicareRate}
                onChange={(e) => setMedicareRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">FICA employee share. Default: 1.45%</p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Preview (based on $600 gross / 40hrs @ $15/hr)</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <span className="text-muted-foreground">Federal</span>
              <span className="text-right text-red-500">
                -${((exampleGross * (Number.parseFloat(federalRate) || 0)) / 100).toFixed(2)}
              </span>
              <span className="text-muted-foreground">NC State</span>
              <span className="text-right text-red-500">
                -${((exampleGross * (Number.parseFloat(stateRate) || 0)) / 100).toFixed(2)}
              </span>
              <span className="text-muted-foreground">Social Security</span>
              <span className="text-right text-red-500">
                -${((exampleGross * (Number.parseFloat(ssRate) || 0)) / 100).toFixed(2)}
              </span>
              <span className="text-muted-foreground">Medicare</span>
              <span className="text-right text-red-500">
                -${((exampleGross * (Number.parseFloat(medicareRate) || 0)) / 100).toFixed(2)}
              </span>
              <span className="font-medium pt-2 border-t">Total Rate</span>
              <span className="font-medium text-right pt-2 border-t">{totalRate.toFixed(2)}%</span>
              <span className="font-medium">Net Pay</span>
              <span className="font-semibold text-right text-emerald-600">${exampleNet.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
