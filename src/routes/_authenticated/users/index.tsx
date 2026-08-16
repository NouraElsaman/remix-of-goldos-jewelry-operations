import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute } from "@/lib/rbac";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { UserPlus, ShieldCheck, Lock, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DataTable,
  PageHeader,
  StatusBadge,
  TableContainer,
  type DataTableColumn,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import type { AppUser } from "@/types/domain";
import { PermissionMatrix } from "@/lib/rbac";
import { Card } from "@/components/ui/card";

import {
  getRegisteredUsers,
  fetchRegisteredUsersAsync,
  registerNewUser,
  deleteUserFromSupabase,
} from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/users/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/users")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "المستخدمون والأدوار — جوهرة تك" },
      {
        name: "description",
        content:
          "إدارة فريق العمل، الصلاحيات والأدوار للمالك والكاشير ومسؤول المخزون.",
      },
      { property: "og:title", content: "المستخدمون والأدوار — جوهرة تك" },
      {
        property: "og:description",
        content:
          "Manage shop staff, roles and access for owners, cashiers and stock managers.",
      },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { t, locale } = useI18n();

  // Load from localStorage via auth helper or seed initial default users
  const [users, setUsers] = useState<AppUser[]>(() => {
    return getRegisteredUsers();
  });

  useEffect(() => {
    void fetchRegisteredUsersAsync().then((synced) => {
      setUsers(synced);
    });
  }, []);

  const saveUsers = (nextUsers: AppUser[]) => {
    setUsers(nextUsers);
    localStorage.setItem("goldos_users_list", JSON.stringify(nextUsers));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"owner" | "cashier" | "inventory_manager">("cashier");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState("");

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      toast.error(locale === "ar" ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === newUserEmail.trim().toLowerCase())) {
      toast.error(
        locale === "ar"
          ? "هذا البريد الإلكتروني مُسجّل بالفعل لموظف آخر"
          : "This email is already registered for another employee",
      );
      return;
    }

    if (newUserPassword.length < 4) {
      toast.error(
        locale === "ar"
          ? "يجب أن تكون كلمة المرور 4 خانات على الأقل"
          : "Password must be at least 4 characters long",
      );
      return;
    }

    if (newUserPassword !== newUserConfirmPassword) {
      toast.error(
        locale === "ar"
          ? "كلمتا المرور غير متطابقتين، يرجى التأكد وإعادة المحاولة"
          : "Passwords do not match, please verify and try again",
      );
      return;
    }

    const newUser: AppUser = {
      id: `usr_${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      active: true,
      password: newUserPassword,
    };

    setUsers((prev) => [...prev.filter((u) => u.id !== newUser.id), newUser]);
    await registerNewUser(newUser);

    toast.success(
      locale === "ar"
        ? "تم إضافة الموظف وإنشاء بيانات الدخول بنجاح!"
        : "Employee account created successfully!",
    );
    setIsModalOpen(false);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("cashier");
    setNewUserPassword("");
    setNewUserConfirmPassword("");
  };

  const toggleUserStatus = (userId: string) => {
    const next = users.map((u) => {
      if (u.id === userId) {
        const updated = { ...u, active: !u.active };
        void registerNewUser(updated);
        return updated;
      }
      return u;
    });
    saveUsers(next);
    toast.success(locale === "ar" ? "تم تحديث حالة المستخدم" : "User status updated");
  };

  const changeUserRole = (userId: string, role: "owner" | "cashier" | "inventory_manager") => {
    const next = users.map((u) => {
      if (u.id === userId) {
        const updated = { ...u, role };
        void registerNewUser(updated);
        return updated;
      }
      return u;
    });
    saveUsers(next);
    toast.success(locale === "ar" ? "تم تعديل صلاحية المستخدم" : "User role updated");
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (userId === "usr_owner" || target?.email === "nourahelaly56@gmail.com") {
      toast.error(locale === "ar" ? "لا يمكن حذف حساب المالك الرئيسي" : "Cannot delete the main owner account");
      return;
    }
    const next = users.filter((u) => u.id !== userId);
    saveUsers(next);
    void deleteUserFromSupabase(userId);
    toast.success(locale === "ar" ? "تم حذف الموظف بنجاح" : "Staff deleted successfully");
  };

  const roleTranslations: Record<string, string> = {
    owner: locale === "ar" ? "المالك" : "Owner",
    cashier: locale === "ar" ? "كاشير" : "Cashier",
    inventory_manager: locale === "ar" ? "مسؤول المخزون" : "Stock Manager",
  };

  const isMainOwnerRow = (row: AppUser) =>
    row.id === "usr_owner" ||
    row.id === "usr_1" ||
    row.email.toLowerCase() === "nourahelaly56@gmail.com";

  const columns = useMemo<DataTableColumn<AppUser>[]>(
    () => [
      {
        id: "name",
        header: locale === "ar" ? "الاسم" : "Name",
        cell: (row) => <span className="font-semibold text-foreground">{row.name}</span>,
      },
      {
        id: "email",
        header: locale === "ar" ? "اسم المستخدم / البريد" : "Username / Email",
        cell: (row) => <span className="text-muted-foreground text-xs">{row.email}</span>,
      },
      {
        id: "role",
        header: locale === "ar" ? "الدور والصلاحية" : "Role / Access",
        cell: (row) => (
          <select
            value={row.role}
            disabled={isMainOwnerRow(row)}
            onChange={(e) => changeUserRole(row.id, e.target.value as any)}
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="owner">{locale === "ar" ? "المالك (Owner)" : "Owner"}</option>
            <option value="cashier">{locale === "ar" ? "الكاشير (Cashier)" : "Cashier"}</option>
            <option value="inventory_manager">{locale === "ar" ? "مسؤول المخزون" : "Stock Manager"}</option>
          </select>
        ),
      },
      {
        id: "status",
        header: locale === "ar" ? "الحالة" : "Status",
        cell: (row) => (
          <button
            onClick={() => toggleUserStatus(row.id)}
            disabled={isMainOwnerRow(row)}
            className="flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <StatusBadge tone={row.active ? "success" : "neutral"}>
              {row.active ? (locale === "ar" ? "نشط" : "Active") : (locale === "ar" ? "معطل" : "Disabled")}
            </StatusBadge>
          </button>
        ),
      },
      {
        id: "actions",
        header: locale === "ar" ? "الإجراءات" : "Actions",
        cell: (row) => (
          <Button
            variant="ghost"
            disabled={isMainOwnerRow(row)}
            onClick={() => deleteUser(row.id)}
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="size-4" />
          </Button>
        ),
        width: "4rem",
      },
    ],
    [locale, users],
  );

  const features = [
    { key: "/dashboard", label: t("nav.dashboard") },
    { key: "/cashier", label: t("nav.cashier") },
    { key: "/inventory", label: t("nav.inventory") },
    { key: "/gold-prices", label: t("nav.goldPrices") },
    { key: "/reconciliation", label: t("nav.reconciliation") },
    { key: "/reports", label: t("nav.reports") },
    { key: "/analytics", label: t("nav.analytics") },
    { key: "/users", label: t("nav.users") },
    { key: "/settings", label: t("nav.settings") },
  ] as const;

  return (
    <PageTransition>
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="h-10 gap-2 rounded-xl">
            <UserPlus className="size-4" />
            {locale === "ar" ? "إضافة موظف" : "Add Staff"}
          </Button>
        }
      />

      <div className="flex flex-col gap-8 max-w-5xl mx-auto py-6">
        <TableContainer>
          <DataTable
            columns={columns}
            rows={users}
            getRowId={(row) => row.id}
            isLoading={false}
            emptyTitle={t("common.empty")}
            emptyDescription={t("common.placeholderNote")}
          />
        </TableContainer>

        {/* Permission Matrix Preview */}
        <Card className="overflow-hidden border-border bg-surface shadow-sm rounded-2xl">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h3 className="font-semibold text-foreground">
              مصفوفة الصلاحيات والأدوار الفعالة
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              توضيح حقوق القراءة والكتابة المطبقة لكل دور في النظام.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-6 py-4 font-medium text-muted-foreground">
                    القسم / الواجهة
                  </th>
                  <th className="px-6 py-4 font-medium text-center text-amber-700">
                    المالك (Owner)
                  </th>
                  <th className="px-6 py-4 font-medium text-center text-emerald-700">
                    الكاشير (Cashier)
                  </th>
                  <th className="px-6 py-4 font-medium text-center text-blue-700">
                    مسؤول المخزون (Stock)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {features.map((feature) => {
                  const o = PermissionMatrix.owner[feature.key];
                  const c = PermissionMatrix.cashier[feature.key];
                  const i = PermissionMatrix.inventory_manager[feature.key];

                  const renderAccess = (perms: {
                    canView: boolean;
                    canEdit: boolean;
                  }) => {
                    if (!perms.canView)
                      return (
                        <span className="text-destructive/50 font-medium">
                          ❌
                        </span>
                      );
                    if (!perms.canEdit)
                      return (
                        <span className="text-sky-600 font-medium text-xs bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/30">
                          🔍 قراءة فقط
                        </span>
                      );
                    return (
                      <span className="text-emerald-600 font-medium">✅ كامل</span>
                    );
                  };

                  return (
                    <tr
                      key={feature.key}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-3 font-medium text-foreground">
                        {feature.label}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {renderAccess(o)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {renderAccess(c)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {renderAccess(i)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ────────────────── ADD USER MODAL ────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-foreground">
                {locale === "ar" ? "إضافة موظف جديد" : "Add New Staff Member"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">{locale === "ar" ? "اسم الموظف كامل" : "Full Name"}</Label>
                <Input
                  id="u-name"
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: طارق علي" : "e.g. Tariq Ali"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-email">{locale === "ar" ? "اسم المستخدم أو البريد" : "Username or Email"}</Label>
                <Input
                  id="u-email"
                  type="text"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder={locale === "ar" ? "tariq@alasala.sa" : "tariq@alasala.sa"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-role">{locale === "ar" ? "الدور والصلاحية" : "Role / Permission Group"}</Label>
                <select
                  id="u-role"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="cashier">{locale === "ar" ? "كاشير (Cashier)" : "Cashier"}</option>
                  <option value="inventory_manager">{locale === "ar" ? "مسؤول المخزون (Stock Manager)" : "Stock Manager"}</option>
                  <option value="owner">{locale === "ar" ? "المالك (Owner)" : "Owner"}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-pass">{locale === "ar" ? "كلمة المرور" : "Password"}</Label>
                <Input
                  id="u-pass"
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-confirm-pass">{locale === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}</Label>
                <Input
                  id="u-confirm-pass"
                  type="password"
                  required
                  value={newUserConfirmPassword}
                  onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl h-11"
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" variant="gold" className="rounded-xl h-11">
                  {locale === "ar" ? "حفظ الموظف" : "Save Staff"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
