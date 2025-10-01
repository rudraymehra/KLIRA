import { render, screen } from "../../test-utils";
import StatusBadge from "@/components/ui/StatusBadge";
import type { OrderStatus } from "@/types";

describe("StatusBadge", () => {
  const statuses: OrderStatus[] = ["open", "filled", "cancelled", "expired"];

  it.each(statuses)("renders '%s' status text", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<StatusBadge status="open" />);
    const badge = screen.getByText("open");
    expect(badge.tagName).toBe("SPAN");
  });

  it("applies cyan styles for open status", () => {
    render(<StatusBadge status="open" />);
    const badge = screen.getByText("open");
    expect(badge.className).toContain("neon-cyan");
  });

  it("applies green styles for filled status", () => {
    render(<StatusBadge status="filled" />);
    const badge = screen.getByText("filled");
    expect(badge.className).toContain("neon-green");
  });

  it("applies pink styles for expired status", () => {
    render(<StatusBadge status="expired" />);
    const badge = screen.getByText("expired");
    expect(badge.className).toContain("neon-pink");
  });

  it("applies pulse animation for open status", () => {
    render(<StatusBadge status="open" />);
    const badge = screen.getByText("open");
    expect(badge.className).toContain("animate-pulse-slow");
  });

  it("does not apply pulse animation for non-open statuses", () => {
    render(<StatusBadge status="filled" />);
    const badge = screen.getByText("filled");
    expect(badge.className).not.toContain("animate-pulse");
  });

  it("has border styling", () => {
    render(<StatusBadge status="open" />);
    const badge = screen.getByText("open");
    expect(badge.className).toContain("border");
  });

  it("has uppercase text", () => {
    render(<StatusBadge status="open" />);
    const badge = screen.getByText("open");
    expect(badge.className).toContain("uppercase");
  });
});
