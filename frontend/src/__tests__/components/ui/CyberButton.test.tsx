import { render, screen, fireEvent } from "../../test-utils";
import CyberButton from "@/components/ui/CyberButton";

describe("CyberButton", () => {
  it("renders children text", () => {
    render(<CyberButton>Click Me</CyberButton>);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = jest.fn();
    render(<CyberButton onClick={handleClick}>Click</CyberButton>);
    fireEvent.click(screen.getByText("Click"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const handleClick = jest.fn();
    render(
      <CyberButton onClick={handleClick} disabled>
        Click
      </CyberButton>
    );
    fireEvent.click(screen.getByText("Click"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders with button type by default", () => {
    render(<CyberButton>Click</CyberButton>);
    const button = screen.getByText("Click");
    expect(button).toHaveAttribute("type", "button");
  });

  it("renders with submit type when specified", () => {
    render(<CyberButton type="submit">Submit</CyberButton>);
    const button = screen.getByText("Submit");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("applies disabled attribute", () => {
    render(<CyberButton disabled>Disabled</CyberButton>);
    expect(screen.getByText("Disabled")).toBeDisabled();
  });

  it("applies disabled opacity class", () => {
    render(<CyberButton disabled>Disabled</CyberButton>);
    const button = screen.getByText("Disabled");
    expect(button.className).toContain("opacity-40");
  });

  it("applies custom className", () => {
    render(<CyberButton className="w-full">Full</CyberButton>);
    const button = screen.getByText("Full");
    expect(button.className).toContain("w-full");
  });

  it("applies primary variant styles by default", () => {
    render(<CyberButton>Primary</CyberButton>);
    const button = screen.getByText("Primary");
    expect(button.className).toContain("neon-cyan");
  });

  it("applies danger variant styles", () => {
    render(<CyberButton variant="danger">Danger</CyberButton>);
    const button = screen.getByText("Danger");
    expect(button.className).toContain("neon-pink");
  });

  it("applies secondary variant styles", () => {
    render(<CyberButton variant="secondary">Secondary</CyberButton>);
    const button = screen.getByText("Secondary");
    expect(button.className).toContain("neon-magenta");
  });

  it("applies ghost variant styles", () => {
    render(<CyberButton variant="ghost">Ghost</CyberButton>);
    const button = screen.getByText("Ghost");
    expect(button.className).toContain("bg-transparent");
  });

  it("applies medium size by default", () => {
    render(<CyberButton>Medium</CyberButton>);
    const button = screen.getByText("Medium");
    expect(button.className).toContain("px-5");
  });

  it("applies small size", () => {
    render(<CyberButton size="sm">Small</CyberButton>);
    const button = screen.getByText("Small");
    expect(button.className).toContain("px-3");
  });

  it("applies large size", () => {
    render(<CyberButton size="lg">Large</CyberButton>);
    const button = screen.getByText("Large");
    expect(button.className).toContain("px-8");
  });
});
