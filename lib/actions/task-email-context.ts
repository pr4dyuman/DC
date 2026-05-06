import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

type TaskEmailContext = {
    suppressEmailNotifications?: boolean;
};

const taskEmailContext = new AsyncLocalStorage<TaskEmailContext>();

export function runWithTaskEmailNotificationsSuppressed<T>(callback: () => T): T {
    const currentContext = taskEmailContext.getStore() || {};
    return taskEmailContext.run(
        { ...currentContext, suppressEmailNotifications: true },
        callback
    );
}

export function shouldSuppressTaskEmailNotifications(): boolean {
    return taskEmailContext.getStore()?.suppressEmailNotifications === true;
}
