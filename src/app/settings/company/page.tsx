'use client';

import { useSettings } from '@/context/settings-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Bot, ShieldAlert, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { RiskAssessmentTool } from '@/app/safety/[reportId]/risk-assessment-tool';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Facility, FindingOption, BookingPurpose } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const REGULATORY_LIMITS = {
  daily: 8,
  weekly: 30,
  monthly: 100,
};

function CompanySettingsPage() {
  const { settings, setSettings } = useSettings();
  const { user, company, updateCompany, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isFacilityDialogOpen, setIsFacilityDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [facilityName, setFacilityName] = useState('');

  const [isFindingDialogOpen, setIsFindingDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<FindingOption | null>(null);
  const [findingName, setFindingName] = useState('');
  
  const [isPurposeDialogOpen, setIsPurposeDialogOpen] = useState(false);
  const [editingPurpose, setEditingPurpose] = useState<BookingPurpose | null>(null);
  const [purposeName, setPurposeName] = useState('');


  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  
  const handleLimitChange = (key: 'dutyLimitDaily' | 'dutyLimitWeekly' | 'dutyLimitMonthly', value: string, max: number) => {
    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
      setSettings(prev => ({
        ...prev,
        [key]: Math.min(numericValue, max), // Ensure value does not exceed regulatory max
      }));
    }
  };
  
  const handleSliderChange = (key: 'expiryWarningOrangeDays' | 'expiryWarningYellowDays', value: number[]) => {
      setSettings(prev => ({ ...prev, [key]: value[0] }));
  };

  const openFacilityDialog = (facility: Facility | null) => {
    setEditingFacility(facility);
    setFacilityName(facility ? facility.name : '');
    setIsFacilityDialogOpen(true);
  };

  const handleFacilitySave = async () => {
    if (!company || !facilityName.trim()) return;

    let updatedFacilities = [...(company.facilities || [])];

    if (editingFacility) {
      // Edit existing facility
      updatedFacilities = updatedFacilities.map(f => f.id === editingFacility.id ? { ...f, name: facilityName.trim() } : f);
    } else {
      // Add new facility
      const newFacility: Facility = {
        id: `facility-${Date.now()}`,
        name: facilityName.trim(),
      };
      updatedFacilities.push(newFacility);
    }
    
    const success = await updateCompany(company.id, { facilities: updatedFacilities });
    if (success) {
      toast({ title: `Facility ${editingFacility ? 'Updated' : 'Added'}` });
      setIsFacilityDialogOpen(false);
      setEditingFacility(null);
      setFacilityName('');
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save facility.' });
    }
  };

  const handleFacilityDelete = async (facilityId: string) => {
    if (!company) return;
    const updatedFacilities = company.facilities?.filter(f => f.id !== facilityId) || [];
    const success = await updateCompany(company.id, { facilities: updatedFacilities });
     if (success) {
      toast({ title: 'Facility Deleted' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete facility.' });
    }
  };
  
  const openFindingDialog = (finding: FindingOption | null) => {
    setEditingFinding(finding);
    setFindingName(finding ? finding.name : '');
    setIsFindingDialogOpen(true);
  };

  const handleFindingSave = async () => {
    if (!company || !findingName.trim()) return;

    let updatedFindings = [...(company.findingOptions || [])];

    if (editingFinding) {
      updatedFindings = updatedFindings.map(f => f.id === editingFinding.id ? { ...f, name: findingName.trim() } : f);
    } else {
      const newFinding: FindingOption = {
        id: `finding-${Date.now()}`,
        name: findingName.trim(),
      };
      updatedFindings.push(newFinding);
    }
    
    const success = await updateCompany(company.id, { findingOptions: updatedFindings });
    if (success) {
      toast({ title: `Finding Option ${editingFinding ? 'Updated' : 'Added'}` });
      setIsFindingDialogOpen(false);
      setEditingFinding(null);
      setFindingName('');
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save finding option.' });
    }
  };

  const handleFindingDelete = async (findingId: string) => {
    if (!company) return;
    const updatedFindings = company.findingOptions?.filter(f => f.id !== findingId) || [];
    const success = await updateCompany(company.id, { findingOptions: updatedFindings });
     if (success) {
      toast({ title: 'Finding Option Deleted' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete finding option.' });
    }
  };
  
  const openPurposeDialog = (purpose: BookingPurpose | null) => {
    setEditingPurpose(purpose);
    setPurposeName(purpose ? purpose.name : '');
    setIsPurposeDialogOpen(true);
  };
  
  const handlePurposeSave = async () => {
      if (!company || !purposeName.trim()) return;
      let updatedPurposes = [...(company.bookingPurposes || [])];

      if (editingPurpose) {
          updatedPurposes = updatedPurposes.map(p => p.id === editingPurpose.id ? { ...p, name: purposeName.trim() } : p);
      } else {
          const newPurpose: BookingPurpose = {
              id: `purpose-${Date.now()}`,
              name: purposeName.trim(),
          };
          updatedPurposes.push(newPurpose);
      }

      const success = await updateCompany(company.id, { bookingPurposes: updatedPurposes });
      if (success) {
          toast({ title: `Booking Purpose ${editingPurpose ? 'Updated' : 'Added'}` });
          setIsPurposeDialogOpen(false);
          setEditingPurpose(null);
          setPurposeName('');
      } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to save booking purpose.' });
      }
  };
  
  const handlePurposeDelete = async (purposeId: string) => {
      if (!company) return;
      const updatedPurposes = company.bookingPurposes?.filter(p => p.id !== purposeId) || [];
      const success = await updateCompany(company.id, { bookingPurposes: updatedPurposes });
      if (success) {
          toast({ title: 'Booking Purpose Deleted' });
      } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete booking purpose.' });
      }
  };


  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  return (
      <main className="flex-1 p-4 md:p-8 space-y-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Operational Rules & Workflow</CardTitle>
            <CardDescription>
              Enable or disable specific operational rules for the entire system.
              These settings typically require manager-level permissions to change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <h3 className="font-semibold text-lg">Checklist Enforcement</h3>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="enforce-pre-flight" className="text-base">
                        Enforce Pre-Flight Checks
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        Prevent approval of a flight booking until the pre-flight checklist for that specific flight is complete.
                        </p>
                    </div>
                    <Switch
                        id="enforce-pre-flight"
                        checked={settings.enforcePreFlightCheck}
                        onCheckedChange={() => handleToggle('enforcePreFlightCheck')}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="require-pre-flight-photos" className="text-base">
                        Require Pre-Flight Photos
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        Make left and right side aircraft photos mandatory during pre-flight checks.
                        </p>
                    </div>
                    <Switch
                        id="require-pre-flight-photos"
                        checked={settings.requirePreFlightPhotos}
                        onCheckedChange={() => handleToggle('requirePreFlightPhotos')}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="enforce-post-flight" className="text-base">
                        Enforce Post-Flight Checks
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        Prevent approval of a new flight booking until the previous flight's post-flight checklist for that aircraft is complete.
                        </p>
                    </div>
                    <Switch
                        id="enforce-post-flight"
                        checked={settings.enforcePostFlightCheck}
                        onCheckedChange={() => handleToggle('enforcePostFlightCheck')}
                    />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="require-post-flight-photos" className="text-base">
                        Require Post-Flight Photos
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        Make left and right side aircraft photos mandatory during post-flight checks.
                        </p>
                    </div>
                    <Switch
                        id="require-post-flight-photos"
                        checked={settings.requirePostFlightPhotos}
                        onCheckedChange={() => handleToggle('requirePostFlightPhotos')}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="enforce-post-maintenance" className="text-base">
                        Enforce Post-Maintenance Checks
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        Prevent an aircraft from being booked if it is in maintenance until a maintenance checklist is completed.
                        </p>
                    </div>
                    <Switch
                        id="enforce-post-maintenance"
                        checked={settings.enforcePostMaintenanceCheck}
                        onCheckedChange={() => handleToggle('enforcePostMaintenanceCheck')}
                    />
                </div>
            </div>

            <Separator />
            
            <div className="space-y-2">
                <h3 className="font-semibold text-lg">System Features</h3>
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="pwa-enabled" className="text-base">
                        Enable Progressive Web App (PWA)
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        Allows users to install the app on their devices for an offline-capable, native-like experience.
                        </p>
                    </div>
                    <Switch
                        id="pwa-enabled"
                        checked={settings.pwaEnabled}
                        onCheckedChange={() => handleToggle('pwaEnabled')}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="use-ai-checklists" className="text-base">
                        Enable AI-Powered Checklists
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        Use AI to scan aircraft registration numbers and Hobbs meters to streamline checklist completion.
                        </p>
                    </div>
                    <Switch
                        id="use-ai-checklists"
                        checked={settings.useAiChecklists}
                        onCheckedChange={() => handleToggle('useAiChecklists')}
                    />
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Flight & Duty Limits</h3>
                <p className="text-sm text-muted-foreground">
                    Set company-specific flight hour limits. These cannot exceed regulatory maximums.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="daily-limit">Daily Limit (Max: {REGULATORY_LIMITS.daily} hrs)</Label>
                        <Input
                            id="daily-limit"
                            type="number"
                            value={settings.dutyLimitDaily}
                            onChange={e => handleLimitChange('dutyLimitDaily', e.target.value, REGULATORY_LIMITS.daily)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="weekly-limit">Weekly Limit (Max: {REGULATORY_LIMITS.weekly} hrs)</Label>
                        <Input
                            id="weekly-limit"
                            type="number"
                            value={settings.dutyLimitWeekly}
                            onChange={e => handleLimitChange('dutyLimitWeekly', e.target.value, REGULATORY_LIMITS.weekly)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="monthly-limit">Monthly Limit (Max: {REGULATORY_LIMITS.monthly} hrs)</Label>
                        <Input
                            id="monthly-limit"
                            type="number"
                            value={settings.dutyLimitMonthly}
                            onChange={e => handleLimitChange('dutyLimitMonthly', e.target.value, REGULATORY_LIMITS.monthly)}
                        />
                    </div>
                </div>
            </div>
            
            <Separator />

            <div className="space-y-4">
                 <h3 className="font-semibold text-lg">Document Expiry Warnings</h3>
                <p className="text-sm text-muted-foreground">
                    Set the number of days before a document's expiry to show a warning.
                </p>
                <div className="space-y-6 pt-2">
                    <div className="grid gap-2">
                        <Label>Orange Warning (Expires Soon)</Label>
                        <div className="flex items-center gap-4">
                            <Slider
                                value={[settings.expiryWarningOrangeDays]}
                                onValueChange={(value) => handleSliderChange('expiryWarningOrangeDays', value)}
                                max={90}
                                step={5}
                            />
                            <span className="font-semibold w-24 text-right">{settings.expiryWarningOrangeDays} days</span>
                        </div>
                    </div>
                     <div className="grid gap-2">
                        <Label>Yellow Warning (Expires Later)</Label>
                         <div className="flex items-center gap-4">
                            <Slider
                                value={[settings.expiryWarningYellowDays]}
                                onValueChange={(value) => handleSliderChange('expiryWarningYellowDays', value)}
                                max={180}
                                step={10}
                            />
                            <span className="font-semibold w-24 text-right">{settings.expiryWarningYellowDays} days</span>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Facilities</h3>
                 <Card>
                    <CardHeader className="flex-row justify-between items-center">
                        <div>
                        <CardTitle className="text-base">Manage Facilities</CardTitle>
                        <CardDescription className="text-sm">Add or remove rooms and simulators for scheduling.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => openFacilityDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Facility
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {company?.facilities && company.facilities.length > 0 ? (
                                    company.facilities.map(facility => (
                                        <TableRow key={facility.id}>
                                            <TableCell>{facility.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openFacilityDialog(facility)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleFacilityDelete(facility.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24">
                                            No facilities added yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Audit Finding Options</h3>
                 <Card>
                    <CardHeader className="flex-row justify-between items-center">
                        <div>
                        <CardTitle className="text-base">Manage Finding Options</CardTitle>
                        <CardDescription className="text-sm">Customize the dropdown options for audit findings.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => openFindingDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Finding
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {company?.findingOptions && company.findingOptions.length > 0 ? (
                                    company.findingOptions.map(finding => (
                                        <TableRow key={finding.id}>
                                            <TableCell>{finding.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openFindingDialog(finding)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleFindingDelete(finding.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24">
                                            No custom finding options added yet. Default values will be used.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            <Separator />

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Booking Purposes</h3>
                <Card>
                    <CardHeader className="flex-row justify-between items-center">
                        <div>
                            <CardTitle className="text-base">Manage Booking Purposes</CardTitle>
                            <CardDescription className="text-sm">Customize the dropdown options for the booking purpose.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => openPurposeDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Purpose
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {company?.bookingPurposes && company.bookingPurposes.length > 0 ? (
                                    company.bookingPurposes.map(purpose => (
                                        <TableRow key={purpose.id}>
                                            <TableCell>{purpose.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => openPurposeDialog(purpose)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handlePurposeDelete(purpose.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24">
                                            No custom booking purposes added yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Separator />

             <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><ShieldAlert /> Risk Matrix Configuration</h3>
                <RiskAssessmentTool readOnly={false} />
            </div>

          </CardContent>
        </Card>

        <Dialog open={isFacilityDialogOpen} onOpenChange={setIsFacilityDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingFacility ? 'Edit Facility' : 'Add New Facility'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="facility-name">Facility Name</Label>
                        <Input
                            id="facility-name"
                            value={facilityName}
                            onChange={(e) => setFacilityName(e.target.value)}
                            placeholder="e.g., Classroom A, Simulator 2"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFacilityDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleFacilitySave}>Save Facility</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isFindingDialogOpen} onOpenChange={setIsFindingDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingFinding ? 'Edit Finding Option' : 'Add New Finding Option'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="finding-name">Finding Name</Label>
                        <Input
                            id="finding-name"
                            value={findingName}
                            onChange={(e) => setFindingName(e.target.value)}
                            placeholder="e.g., Compliant, Non-compliant"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFindingDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleFindingSave}>Save Option</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isPurposeDialogOpen} onOpenChange={setIsPurposeDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingPurpose ? 'Edit Booking Purpose' : 'Add New Booking Purpose'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="purpose-name">Purpose Name</Label>
                        <Input
                            id="purpose-name"
                            value={purposeName}
                            onChange={(e) => setPurposeName(e.target.value)}
                            placeholder="e.g., Flight Review, Discovery Flight"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPurposeDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handlePurposeSave}>Save Purpose</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </main>
  );
}

CompanySettingsPage.title = 'Company Settings';
export default CompanySettingsPage;
