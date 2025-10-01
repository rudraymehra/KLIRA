import { render, screen } from "../../test-utils";
import NeonCard from "@/components/ui/NeonCard";

describe("NeonCard", () => {
  it("renders children content", () => {
    render(<NeonCard>Card Content</NeonCard>);
    expect(screen.getByText("Card Content")).toBeInTheDocument();
  });

  it("applies cyan glow by default", () => {
    const { container } = render(<NeonCard>Content</NeonCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("neon-cyan");
  });

  it("applies magenta glow", () => {
    const { container } = render(<NeonCard glow="magenta">Content</NeonCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("neon-magenta");
  });

  it("applies green glow", () => {
    const { container } = render(<NeonCard glow="green">Content</NeonCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("neon-green");
  });

  it("applies pink glow", () => {
    const { container } = render(<NeonCard glow="pink">Content</NeonCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("neon-pink");
  });

  it("applies custom className", () => {
    const { container } = render(<NeonCard className="p-8">Content</NeonCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("p-8");
  });

  it("has border and padding", () => {
    const { container } = render(<NeonCard>Content</NeonCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("border");
    expect(card.className).toContain("p-6");
  });

  it("has bg-cyber-panel class", () => {
    const { container } = render(<NeonCard>Content</NeonCard>);
    const card = container.firstElementChild!;
    expect(card.className).toContain("bg-cyber-panel");
  });

  it("renders complex children", () => {
    render(
      <NeonCard>
        <h3>Title</h3>
        <p>Description</p>
      </NeonCard>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });
});
