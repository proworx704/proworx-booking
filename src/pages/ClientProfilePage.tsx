import { useQuery } from "convex/react";
import { Car, Mail, MapPin, Phone, Star, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

export function ClientProfilePage() {
  const profile = useQuery(api.loyalty.getMyProfile);
  const account = useQuery(api.loyalty.getMyAccount);
  const bookings = useQuery(api.loyalty.getMyBookings);
  const settings = useQuery(api.loyalty.getSettings);

  const totalSpent = bookings
    ?.filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.totalPrice || b.price || 0), 0) || 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Your account details and loyalty status
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="size-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {(profile?.name || "C").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{profile?.name || "—"}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-amber-500 text-white">
                  <Star className="size-3 mr-1" />
                  {(settings as any)?.programName || "ProWorx Rewards"} Member
                </Badge>
              </div>

              <div className="grid gap-3 mt-4 text-sm">
                {profile?.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-4" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile?.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4" />
                    <span>{profile.address}</span>
                  </div>
                )}
                {(profile as any)?.vehicleMake && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Car className="size-4" />
                    <span>
                      {(profile as any).vehicleYear} {(profile as any).vehicleMake}{" "}
                      {(profile as any).vehicleModel}
                      {(profile as any).vehicleColor ? ` · ${(profile as any).vehicleColor}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Points Balance
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {account?.currentPoints?.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Lifetime Earned
            </p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {account?.lifetimeEarned?.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Total Bookings
            </p>
            <p className="text-2xl font-bold mt-1">
              {bookings?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Total Spent
            </p>
            <p className="text-2xl font-bold mt-1">
              ${(totalSpent / 100).toFixed(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expiration Info */}
      {(settings as any)?.expirationEnabled && (settings as any)?.expirationDays && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center flex-shrink-0">
              ⏰
            </div>
            <div>
              <p className="text-sm font-medium">Points Expiration Policy</p>
              <p className="text-sm text-muted-foreground">
                Points expire {(settings as any).expirationDays} days after they're earned.
                {(settings as any).expirationWarningDays &&
                  ` You'll be notified ${(settings as any).expirationWarningDays} days before they expire.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <p>
            Need to update your info? Contact ProWorx at{" "}
            <a
              href="mailto:tyler@proworxdetailing.com"
              className="text-primary underline"
            >
              tyler@proworxdetailing.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
