"use client";

import { useState, useEffect } from "react";
import { getAgencySettings, updateAgencyDetails } from "@/lib/actions";
import { toast } from "sonner";
import { Loader2, Building, Upload, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AgencySettings() {
    const [name, setName] = useState("");
    const [logo, setLogo] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await getAgencySettings();
            if (settings) {
                setName(settings.name);
                setLogo(settings.logo);
                setLogoPreview(settings.logo);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to load agency settings", error);
            toast.error("Failed to load settings");
            setLoading(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (file.size > 2 * 1024 * 1024) { // 2MB Limit
            toast.error("Logo file is too large. Max 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setLogo(result);
            setLogoPreview(result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateAgencyDetails(name, logo);
            toast.success("Agency details updated successfully!");
        } catch (error) {
            console.error("Failed to update agency details", error);
            toast.error("Failed to update details.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-full">
                        <Building className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                        <CardTitle>Agency Branding</CardTitle>
                        <CardDescription>Update your agency's identity and logo.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                    <div className="space-y-2">
                        <Label htmlFor="agency-name">Agency Name</Label>
                        <Input
                            id="agency-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Agency"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <Label>Agency Logo</Label>
                        <div className="flex items-center gap-6">
                            <Avatar className="h-20 w-20 border-2 border-dashed border-gray-300">
                                <AvatarImage src={logoPreview} />
                                <AvatarFallback className="bg-muted text-muted-foreground">
                                    <ImageIcon className="h-8 w-8 opacity-50" />
                                </AvatarFallback>
                            </Avatar>
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" size="sm" className="relative cursor-pointer overflow-hidden">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Logo
                                        <Input 
                                            type="file" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                        />
                                    </Button>
                                    {logo && (
                                        <Button type="button" variant="ghost" size="sm" onClick={() => { setLogo(""); setLogoPreview(""); }}>
                                            Remove
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Recommended: Square PNG or JPG, max 2MB.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
