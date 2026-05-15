"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { getRolePalette } from "@/lib/colors";
import type { Role } from "@/types";

interface RoleFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    color: string;
    isWorkRole: boolean;
  }) => void;
  role?: Role | null;
}

export function RoleForm({ open, onClose, onSave, role }: RoleFormProps) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [color, setColor] = useState(role?.color ?? "#3B82F6");
  const [isWorkRole, setIsWorkRole] = useState(role?.isWorkRole ?? false);
  const [error, setError] = useState("");

  const palette = getRolePalette();
  const isEditing = !!role;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (name.trim().length > 50) {
      setError("Name must be 50 characters or less");
      return;
    }
    setError("");
    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
      isWorkRole,
    });
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setError("");
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setColor(role?.color ?? "#3B82F6");
      setIsWorkRole(role?.isWorkRole ?? false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Role" : "Add New Role"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Professional, Athlete, Partner"
              maxLength={50}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description (optional)</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this role mean to you?"
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    color === c
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Scheduling Rules</Label>

            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setIsWorkRole(!isWorkRole)}
            >
              <Checkbox
                checked={isWorkRole}
                onCheckedChange={(v) => setIsWorkRole(v as boolean)}
              />
              <div>
                <span className="text-sm">Work / professional role</span>
                <p className="text-xs text-muted-foreground">
                  Activities scheduled during work hours (9-5 on weekdays)
                </p>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
