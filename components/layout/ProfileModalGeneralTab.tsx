"use client";

import type { ChangeEvent, RefObject } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/lib/types";
import { AtSign, Briefcase, Building2, Camera, Phone, Shield, Upload } from "lucide-react";

type ProfileModalGeneralTabProps = {
    generalError: string;
    user: User;
    isAdmin: boolean;
    name: string;
    email: string;
    username: string;
    avatar: string;
    jobTitle: string;
    contactNumber: string;
    systemName: string;
    systemLogo: string;
    fileInputRef: RefObject<HTMLInputElement | null>;
    systemLogoRef: RefObject<HTMLInputElement | null>;
    onNameChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    onUsernameChange: (value: string) => void;
    onJobTitleChange: (value: string) => void;
    onContactNumberChange: (value: string) => void;
    onSystemNameChange: (value: string) => void;
    onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onSystemLogoFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function ProfileModalGeneralTab({
    generalError,
    user,
    isAdmin,
    name,
    email,
    username,
    avatar,
    jobTitle,
    contactNumber,
    systemName,
    systemLogo,
    fileInputRef,
    systemLogoRef,
    onNameChange,
    onEmailChange,
    onUsernameChange,
    onJobTitleChange,
    onContactNumberChange,
    onSystemNameChange,
    onAvatarFileChange,
    onSystemLogoFileChange,
}: ProfileModalGeneralTabProps) {
    return (
        <div className="space-y-8">
            {generalError && (
                <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
                    {generalError}
                </div>
            )}

            <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2">
                    <div className="relative group">
                        <button type="button" className="relative rounded-full" onClick={() => fileInputRef.current?.click()} aria-label="Upload avatar image">
                            <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                                <AvatarImage src={avatar} className="object-cover" />
                                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                    {name ? name.substring(0, 2).toUpperCase() : "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-6 w-6 text-white" />
                            </div>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            aria-label="Upload avatar image"
                            onChange={onAvatarFileChange}
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Avatar</span>
                </div>

                <div className="flex-1 min-w-0 space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="profile-name">Full Name</Label>
                        <Input
                            id="profile-name"
                            value={name}
                            onChange={(event) => onNameChange(event.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="profile-email">Email Address</Label>
                        <Input
                            id="profile-email"
                            type="email"
                            value={email}
                            onChange={(event) => onEmailChange(event.target.value)}
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="h-px bg-border/60" />

            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="username" className="flex items-center gap-1.5">
                        <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                        Username
                    </Label>
                    <Input
                        id="username"
                        value={username}
                        onChange={(event) => onUsernameChange(event.target.value)}
                        placeholder="e.g. john_doe"
                    />
                    <p className="text-xs text-muted-foreground">Lowercase letters, numbers, underscores and hyphens only.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="jobTitle" className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            Job Title
                        </Label>
                        <Input
                            id="jobTitle"
                            value={jobTitle}
                            onChange={(event) => onJobTitleChange(event.target.value)}
                            placeholder="e.g. Senior Developer"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="contactNumber" className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            Phone
                        </Label>
                        <Input
                            id="contactNumber"
                            value={contactNumber}
                            onChange={(event) => onContactNumberChange(event.target.value)}
                            placeholder="e.g. +91 9876543210"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label className="text-muted-foreground">My Role</Label>
                        <div className="text-sm font-medium text-foreground capitalize flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            {user.role}
                        </div>
                    </div>
                    {user.employmentType && (
                        <div className="grid gap-2">
                            <Label className="text-muted-foreground">Employment Type</Label>
                            <div className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                {user.employmentType}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isAdmin && (
                <>
                    <div className="h-px bg-border/60" />
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2 text-foreground/80">
                            <Building2 className="h-4 w-4" /> System Branding
                        </h4>

                        <div className="flex items-start gap-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative group">
                                    <button
                                        type="button"
                                        className="h-20 w-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors relative overflow-hidden"
                                        onClick={() => systemLogoRef.current?.click()}
                                        aria-label="Upload system logo"
                                    >
                                        {systemLogo ? (
                                            <Image
                                                src={systemLogo}
                                                alt="System Logo"
                                                fill
                                                unoptimized
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <Upload className="h-6 w-6 text-muted-foreground" />
                                        )}
                                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="h-6 w-6 text-white" />
                                        </span>
                                    </button>
                                    <input
                                        type="file"
                                        ref={systemLogoRef}
                                        className="hidden"
                                        accept="image/*"
                                        aria-label="Upload system logo"
                                        onChange={onSystemLogoFileChange}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Logo</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="grid gap-2">
                                    <Label htmlFor="systemName">System Name</Label>
                                    <Input
                                        id="systemName"
                                        value={systemName}
                                        onChange={(event) => onSystemNameChange(event.target.value)}
                                        placeholder="e.g. AgencyOS"
                                    />
                                    <p className="text-xs text-muted-foreground">Appears in the sidebar and browser title.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
