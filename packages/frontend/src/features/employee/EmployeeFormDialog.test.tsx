import { render } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeFormDialog } from "./EmployeeFormDialog";
import type { DepartmentSummary, EmployeeResponse } from "./employee-api";

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => {
    const { ref, ...rest } = props;
    return createElement("input", rest);
  },
}));

vi.mock("@/components/ui/label", () => ({
  Label: (props: Record<string, unknown>) => {
    const { children, ...rest } = props;
    return createElement("label", rest, children as string);
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: Record<string, unknown>) => {
    const { variant, size, children, ...rest } = props;
    return createElement("button", { type: "button", ...rest }, children as string);
  },
}));

let capturedSelectProps: Array<{ value: unknown; items: unknown }> = [];

vi.mock("@/components/ui/select", () => ({
  Select: (props: Record<string, unknown>) => {
    const { children, value, onValueChange, items, ...rest } = props;
    capturedSelectProps.push({ value, items });
    return createElement("div", { "data-testid": "select-root", ...rest }, children as string);
  },
  SelectTrigger: (props: Record<string, unknown>) => {
    const { children, ...rest } = props;
    return createElement("button", rest, children as string);
  },
  SelectValue: (props: Record<string, unknown>) => {
    const { placeholder, ...rest } = props;
    return createElement("span", { "data-testid": "select-value", ...rest }, placeholder as string);
  },
  SelectContent: (props: Record<string, unknown>) => {
    const { children, ...rest } = props;
    return createElement("div", rest, children as string);
  },
  SelectItem: (props: Record<string, unknown>) => {
    const { children, value, ...rest } = props;
    return createElement("option", { value: value as string, ...rest }, children as string);
  },
}));

vi.mock("@/components/FormDialog", () => ({
  FormDialog: (props: Record<string, unknown>) => {
    const { children, title, open } = props;
    if (!open) return null;
    return createElement("div", { "data-testid": "form-dialog" }, [
      createElement("h2", { key: "title" }, title as string),
      children as string,
    ]);
  },
}));

const mockDepartments: DepartmentSummary[] = [
  { id: "dept-001", name: "開発部" },
  { id: "dept-002", name: "営業部" },
];

const mockEmployee: EmployeeResponse = {
  id: "emp-001",
  name: "田中太郎",
  email: "tanaka@example.com",
  departmentId: "dept-001",
  departmentName: "開発部",
  role: "ADMIN",
  isManager: false,
  hireDate: "2024-04-01",
  retireDate: null,
};

describe("EmployeeFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSelectProps = [];
  });

  describe("編集モードで部署・ロールの名称表示", () => {
    function renderEditForm() {
      render(
        <EmployeeFormDialog
          open={true}
          onOpenChange={vi.fn()}
          mode="edit"
          employee={mockEmployee}
          departments={mockDepartments}
          onSubmitCreate={vi.fn()}
          onSubmitUpdate={vi.fn()}
          isSubmitting={false}
        />,
      );
    }

    it("部署Selectにitems（ID→名称マッピング）が渡される", () => {
      renderEditForm();

      const departmentSelects = capturedSelectProps.filter(
        (p) => p.value === "dept-001" || p.value === null,
      );
      const latest = departmentSelects[departmentSelects.length - 1];
      expect(latest.items).toEqual({
        "dept-001": "開発部",
        "dept-002": "営業部",
      });
    });

    it("ロールSelectにitems（enum→名称マッピング）が渡される", () => {
      renderEditForm();

      const roleSelects = capturedSelectProps.filter(
        (p) => p.value === "ADMIN" || p.value === "EMPLOYEE",
      );
      const latest = roleSelects[roleSelects.length - 1];
      expect(latest.items).toEqual({
        EMPLOYEE: "一般",
        ADMIN: "管理者",
      });
    });
  });

  describe("新規作成モードでも名称表示用itemsが渡される", () => {
    function renderCreateForm() {
      render(
        <EmployeeFormDialog
          open={true}
          onOpenChange={vi.fn()}
          mode="create"
          employee={null}
          departments={mockDepartments}
          onSubmitCreate={vi.fn()}
          onSubmitUpdate={vi.fn()}
          isSubmitting={false}
        />,
      );
    }

    it("新規作成モードでも部署Selectにitemsが渡される", () => {
      renderCreateForm();

      const departmentSelects = capturedSelectProps.filter(
        (p) => p.value === "" || p.value === null,
      );
      const latest = departmentSelects[departmentSelects.length - 1];
      expect(latest.items).toEqual({
        "dept-001": "開発部",
        "dept-002": "営業部",
      });
    });

    it("新規作成モードでもロールSelectにitemsが渡される", () => {
      renderCreateForm();

      const roleSelects = capturedSelectProps.filter(
        (p) => p.value === "EMPLOYEE",
      );
      const latest = roleSelects[roleSelects.length - 1];
      expect(latest.items).toEqual({
        EMPLOYEE: "一般",
        ADMIN: "管理者",
      });
    });
  });

  describe("部署リストが空の場合", () => {
    it("部署Selectのitemsは空オブジェクトが渡される", () => {
      render(
        <EmployeeFormDialog
          open={true}
          onOpenChange={vi.fn()}
          mode="create"
          employee={null}
          departments={[]}
          onSubmitCreate={vi.fn()}
          onSubmitUpdate={vi.fn()}
          isSubmitting={false}
        />,
      );

      const departmentSelects = capturedSelectProps.filter(
        (p) => p.value === "" || p.value === null,
      );
      const latest = departmentSelects[departmentSelects.length - 1];
      expect(latest.items).toEqual({});
    });
  });
});
