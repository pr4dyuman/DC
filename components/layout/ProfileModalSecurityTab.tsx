"use client";

import { Eye, EyeOff, Lock, Shield, Briefcase, Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/lib/types";

type ProfileModalSecurityTabProps = {
    securityError: string;
    user: User;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    showCurrentPassword: boolean;
    showNewPassword: boolean;
    showConfirmPassword: boolean;
    memberSinceText: string;
    lastActiveText: string;
    onCurrentPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onToggleCurrentPassword: () => void;
    onToggleNewPassword: () => void;
    onToggleConfirmPassword: () => void;
};

export function ProfileModalSecurityTab({
    securityError,
    user,
    currentPassword,
    newPassword,
    confirmPassword,
    showCurrentPassword,
    showNewPassword,
    showConfirmPassword,
    memberSinceText,
    lastActiveText,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onToggleCurrentPassword,
    onToggleNewPassword,
    onToggleConfirmPassword,
}: ProfileModalSecurityTabProps) {
    return (
        <div className="space-y-6">
            {securityError && (
                <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
                    {securityError}
                </div>
            )}

            <div className="border-b pb-6">
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Change Password
                </h4>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="current-password"
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(event) => onCurrentPasswordChange(event.target.value)}
                                className="pl-9 pr-9"
                                placeholder="Required to set new password"
                            />
                            <button
                                type="button"
                                onClick={onToggleCurrentPassword}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                            >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(event) => onNewPasswordChange(event.target.value)}
                                    className="pr-9"
                                />
                                <button
                                    type="button"
                                    onClick={onToggleNewPassword}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirm-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(event) => onConfirmPasswordChange(event.target.value)}
                                    className="pr-9"
                                />
                                <button
                                    type="button"
                                    onClick={onToggleConfirmPassword}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Min 8 characters, at least 1 uppercase letter and 1 number.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Account Info
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Shield className="h-3 w-3" /> Role
                        </p>
                        <p className="text-sm font-medium capitalize">{user.role}</p>
                    </div>
                    {user.employmentType && (
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Briefcase className="h-3 w-3" /> Employment
                            </p>
                            <p className="text-sm font-medium">{user.employmentType}</p>
                        </div>
                    )}
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" /> Member Since
                        </p>
                        <p className="text-sm font-medium">{memberSinceText}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Last Active
                        </p>
                        <p className="text-sm font-medium">{lastActiveText}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
