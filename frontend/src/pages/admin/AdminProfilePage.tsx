import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ImageUp, KeyRound, Loader2, ShieldCheck, User } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminService, type AdminProfile } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ACCOUNT_STATUS } from "@/constants/adminStatus";
import { prettyDate } from "@/utils/date";
import { initialsOf } from "@/utils/user";
import { ACCEPT_IMAGE } from "@/utils/validation";
import { getPortal } from "@/config/roles";

/**
 * The admin's own account.
 *
 * The profile photo is the one file an admin uploads, and it goes to the admin
 * blob container, never into the drivers' document store.
 */
export function AdminProfilePage() {
  const { refreshUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  /** The container is private, so the photo needs a freshly signed link. */
  const loadPhoto = useCallback(async (hasPhoto: boolean) => {
    if (!hasPhoto) {
      setPhotoUrl(null);
      return;
    }
    try {
      const link = await adminService.avatarLink();
      setPhotoUrl(
        /^https?:\/\//i.test(link.url)
          ? link.url
          : // No Azure credentials locally: fall back to the authenticated route.
            null,
      );
    } catch {
      setPhotoUrl(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await adminService.me();
      setProfile(next);
      setFirstName(next.firstName);
      setLastName(next.lastName ?? "");
      setPhone(next.phone ?? "");
      await loadPhoto(Boolean(next.avatarUrl));
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load your profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadPhoto]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const next = await adminService.updateMe({
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
      });
      setProfile(next);
      await refreshUser();
      toast.success("Profile updated");
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setFieldErrors(caught.fieldMap);
        toast.error("Could not save your profile", { description: caught.message });
      } else {
        toast.error("Could not save your profile");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(file?: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const saved = await adminService.uploadAvatar(file);
      setProfile((current) => (current ? { ...current, avatarUrl: saved.avatarUrl } : current));
      await loadPhoto(Boolean(saved.avatarUrl));
      toast.success("Profile photo updated", {
        description: "Stored in the admin container.",
      });
    } catch (caught) {
      toast.error("Could not upload that photo", {
        description:
          caught instanceof ApiRequestError ? caught.message : "Please try again in a moment.",
      });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <DashboardLayout>
      {loading ? (
        <PanelLoader label="Loading your profile" />
      ) : error || !profile ? (
        <PanelError message={error ?? "No data"} onRetry={() => void load()} />
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your own admin account details.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            {/* Photo and account facts */}
            <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-secondary text-2xl font-semibold text-slate-500 shadow-card ring-1 ring-border">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : profile.avatarUrl ? (
                    <User className="h-12 w-12 text-slate-300" />
                  ) : (
                    <span aria-hidden>
                      {initialsOf({
                        displayName: [profile.firstName, profile.lastName]
                          .filter(Boolean)
                          .join(" "),
                        email: profile.email,
                      })}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-base font-semibold text-foreground">
                    {[profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
                      profile.email}
                  </p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant={ACCOUNT_STATUS[profile.status].variant}>
                    {ACCOUNT_STATUS[profile.status].label}
                  </Badge>
                  {profile.isSuperAdmin && (
                    <Badge variant="default">
                      <ShieldCheck className="h-3.5 w-3.5" /> Super admin
                    </Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageUp className="h-4 w-4" />
                  )}
                  {profile.avatarUrl ? "Replace photo" : "Upload photo"}
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT_IMAGE}
                  className="hidden"
                  onChange={(event) => void handlePhoto(event.target.files?.[0])}
                />

                <p className="text-xs text-muted-foreground">
                  Admin member since {prettyDate(profile.createdAt)}
                </p>
              </div>
            </section>

            {/* Editable details */}
            <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Details
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Your email identifies this account and cannot be changed here.
              </p>

              <form onSubmit={handleSave} className="space-y-5" noValidate>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      className="mt-1.5"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                    />
                    {fieldErrors.firstName && (
                      <p className="mt-1 text-xs font-medium text-red-500">
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      className="mt-1.5"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      className="mt-1.5"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-xs font-medium text-red-500">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      readOnly
                      className="mt-1.5 cursor-not-allowed bg-secondary/70 text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={getPortal("admin").changePasswordPath}>
                      <KeyRound className="h-4 w-4" /> Change password
                    </Link>
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
