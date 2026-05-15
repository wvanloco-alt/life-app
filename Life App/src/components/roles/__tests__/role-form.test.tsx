import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleForm } from "../role-form";

vi.mock("@/lib/colors", () => ({
  getRolePalette: () => ["#3B82F6", "#EF4444", "#10B981"],
}));

describe("RoleForm", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    role: null,
  };

  it("renders the form with empty fields when creating", () => {
    render(<RoleForm {...defaultProps} />);
    expect(screen.getByText("Add New Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("shows an error when submitting without a name", async () => {
    render(<RoleForm {...defaultProps} />);

    fireEvent.click(screen.getByText("Create Role"));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with correct data when valid", async () => {
    const onSave = vi.fn();
    render(<RoleForm {...defaultProps} onSave={onSave} />);

    const nameInput = screen.getByLabelText("Name");
    await userEvent.type(nameInput, "My Role");
    fireEvent.click(screen.getByText("Create Role"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Role",
          isWorkRole: false,
        })
      );
    });
  });

  it("shows Edit Role title when editing an existing role", () => {
    const existingRole = {
      id: 1,
      name: "Athlete",
      description: "Physical fitness",
      color: "#EF4444",
      displayOrder: 0,
      isArchived: false,
      isWorkRole: false,
      createdAt: "",
      updatedAt: "",
    };

    render(<RoleForm {...defaultProps} role={existingRole} />);
    expect(screen.getByText("Edit Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Athlete");
  });
});
