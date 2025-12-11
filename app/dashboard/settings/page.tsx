"use client";

import { useState, useEffect } from "react";
import { getCategories, addCategory, deleteCategory, updateCategory } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Edit2, Check, X } from "lucide-react";

export default function SettingsPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState("");
    const [adding, setAdding] = useState(false);

    // Edit Mode State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getCategories();
        setCategories(data);
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        setAdding(true);
        await addCategory(newCategory);
        setNewCategory("");
        setAdding(false);
        loadData();
    };

    const handleDelete = async (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id)); // Optimistic
        await deleteCategory(id);
        loadData();
    };

    const startEdit = (category: any) => {
        setEditingId(category.id);
        setEditName(category.name);
    };

    const saveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        setCategories(prev => prev.map(c => c.id === editingId ? { ...c, name: editName } : c)); // Optimistic
        await updateCategory(editingId, editName);
        setEditingId(null);
        setEditName("");
        loadData();
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Category Management</CardTitle>
                        <CardDescription>Manage project and task categories.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Add Form */}
                        <form onSubmit={handleAdd} className="flex gap-2">
                            <input
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                placeholder="New Category Name..."
                                className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                            />
                            <button disabled={adding} type="submit" className="h-10 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </button>
                        </form>

                        {/* List */}
                        {loading ? (
                            <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                        ) : (
                            <div className="space-y-2">
                                {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
                                        {editingId === cat.id ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="flex-1 h-8 rounded-md border border-input px-2 text-sm"
                                                    autoFocus
                                                />
                                                <button onClick={saveEdit} className="h-8 w-8 flex items-center justify-center text-green-600 hover:bg-green-100 rounded-md"><Check className="h-4 w-4" /></button>
                                                <button onClick={cancelEdit} className="h-8 w-8 flex items-center justify-center text-red-600 hover:bg-red-100 rounded-md"><X className="h-4 w-4" /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium text-sm">{cat.name}</span>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => startEdit(cat)} className="h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md hover:text-indigo-600"><Edit2 className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => handleDelete(cat.id)} className="h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {categories.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No categories found.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>App-wide configuration.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">More settings coming soon...</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
