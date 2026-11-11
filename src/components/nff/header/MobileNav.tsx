import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/nff/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ALL_EXPLORATIONS_LINK,
  LIBRARY_ITEMS,
  NAV_LINKS,
  STAFF_ROLES,
  useNavActive,
} from "./navConfig";

/** Large editorial rows for the top level of the sheet. */
const topRowClass =
  "flex min-h-14 w-full items-center justify-between gap-4 rounded-lg px-3 font-serif text-[1.25rem] font-normal leading-7 tracking-[-0.01em] text-foreground transition-colors hover:bg-nff-bg-hover";
const rowBorder = "border-b border-nff-border-default";

function SheetLink({
  href,
  children,
  active,
  className,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <SheetClose asChild>
      <Link
        to={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center rounded-lg px-3 nff-body-md text-foreground transition-colors hover:bg-nff-bg-hover nff-focus-ring",
          active && "bg-nff-bg-selected font-medium text-nff-text-brand",
          className,
        )}
      >
        {children}
      </Link>
    </SheetClose>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 pb-1 nff-overline text-nff-text-tertiary">{label}</p>
      {children}
    </div>
  );
}

/** Navigation sheet for <1024px. Holds everything the compact header hides. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { item, section } = useNavActive();
  const isPractitioner = user?.role === "practitioner";
  const isStaff = user ? STAFF_ROLES.includes(user.role) : false;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 rounded-full lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 bg-nff-bg-public p-0 sm:max-w-sm"
      >
        <div className="flex h-[var(--nff-layout-header-height)] shrink-0 items-center justify-between border-b px-[var(--nff-layout-margin)] sm:px-5">
          <BrandLogo />
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </Button>
          </SheetClose>
        </div>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>

        <nav
          aria-label="Mobile"
          className="flex flex-1 flex-col gap-8 overflow-y-auto px-[calc(var(--nff-layout-margin)-12px)] py-4 sm:px-2"
        >
          <div>
            {/* The Library expands in place; open by default on a library page. */}
            <Accordion
              type="single"
              collapsible
              defaultValue={section("library") ? "library" : undefined}
            >
              <AccordionItem value="library" className={cn(rowBorder, "last:border-b")}>
                <AccordionTrigger
                  className={cn(
                    topRowClass,
                    "items-center py-0 hover:no-underline [&>svg]:size-5 [&>svg]:translate-y-0",
                    section("library") && "text-nff-text-brand",
                  )}
                >
                  The Library
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-0.5 pb-4">
                  {LIBRARY_ITEMS.map((entry) => (
                    <SheetLink
                      key={entry.key}
                      href={entry.href}
                      active={item(entry.href)}
                      className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2 py-2.5"
                    >
                      <span
                        aria-hidden="true"
                        className="pt-0.5 font-serif text-[0.875rem] leading-5 tabular-nums text-nff-text-tertiary"
                      >
                        {entry.index}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="nff-label-md">{entry.label}</span>
                        <span className="nff-caption font-normal text-nff-text-secondary">
                          {entry.description}
                        </span>
                      </span>
                    </SheetLink>
                  ))}
                  <SheetLink
                    href={ALL_EXPLORATIONS_LINK.href}
                    active={item(ALL_EXPLORATIONS_LINK.href)}
                    className="nff-label-md text-nff-text-brand"
                  >
                    {ALL_EXPLORATIONS_LINK.label}
                  </SheetLink>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <ul>
              {NAV_LINKS.map((link) => {
                const active = section(link.id);
                return (
                  <li key={link.id} className={rowBorder}>
                    <SheetClose asChild>
                      <Link
                        to={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          topRowClass,
                          "nff-focus-ring",
                          active && "text-nff-text-brand",
                        )}
                      >
                        {link.label}
                        {active && (
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-[var(--nff-nav-indicator)]"
                          />
                        )}
                      </Link>
                    </SheetClose>
                  </li>
                );
              })}
            </ul>
          </div>

          {user && (
            <Group label="Your account">
              {isPractitioner && (
                <>
                  <SheetLink href="/journey" active={item("/journey")}>
                    Journey
                  </SheetLink>
                  <SheetLink href="/my-journey" active={item("/my-journey")}>
                    My Journey
                  </SheetLink>
                </>
              )}
              {isStaff && <SheetLink href="/cms">CMS</SheetLink>}
              <SheetLink href="/account/profile">Profile</SheetLink>
              <SheetLink href="/account/email">Email preferences</SheetLink>
              <SheetLink href="/account/privacy">Privacy</SheetLink>
            </Group>
          )}
        </nav>

        <div className="flex shrink-0 flex-col gap-2 border-t bg-nff-bg-surface p-4">
          {user ? (
            <>
              <SheetClose asChild>
                <Button asChild className="h-12">
                  <Link to={isStaff ? "/cms" : "/journey"}>
                    {isStaff ? "Open CMS" : "Continue journey"}
                  </Link>
                </Button>
              </SheetClose>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => {
                  setOpen(false);
                  logout();
                  navigate("/");
                }}
              >
                <LogOut aria-hidden="true" className="size-4" />
                Log out
              </Button>
            </>
          ) : (
            <>
              <SheetClose asChild>
                <Button asChild className="h-12">
                  <Link to="/signup">Begin your journey</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="outline" className="h-12">
                  <Link to="/login">Log in</Link>
                </Button>
              </SheetClose>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
