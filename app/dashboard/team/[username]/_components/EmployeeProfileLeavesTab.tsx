"use client";

import { LeaveRequest } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { LeaveRequestsList } from "@/components/leave-requests-list";

interface EmployeeProfileLeavesTabProps {
    isSelf: boolean;
    userName: string;
    leaveRequests: LeaveRequest[];
}

export function EmployeeProfileLeavesTab({
    isSelf,
    userName,
    leaveRequests,
}: EmployeeProfileLeavesTabProps) {
    return (
        <TabsContent value="leaves" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Leave History</CardTitle>
                    <CardDescription>
                        {isSelf ? "View your leave requests and status" : `Leave requests for ${userName}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LeaveRequestsList requests={leaveRequests} mode="user" />
                </CardContent>
            </Card>
        </TabsContent>
    );
}
