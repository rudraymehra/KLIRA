import { render, screen } from "../../test-utils";
import GlitchText from "@/components/ui/GlitchText";

describe("GlitchText", () => {
  it("renders the text content", () => {
    render(<GlitchText text="Hello World" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders as h1 by default", () => {
    render(<GlitchText text="Title" />);
    const element = screen.getByText("Title");
    expect(element.tagName).toBe("H1");
  });

  it("renders as h2 when specified", () => {
    render(<GlitchText text="Subtitle" as="h2" />);
    const element = screen.getByText("Subtitle");
    expect(element.tagName).toBe("H2");
  });

  it("renders as h3 when specified", () => {
    render(<GlitchText text="Section" as="h3" />);
    const element = screen.getByText("Section");
    expect(element.tagName).toBe("H3");
  });

  it("renders as span when specified", () => {
    render(<GlitchText text="Inline" as="span" />);
    const element = screen.getByText("Inline");
    expect(element.tagName).toBe("SPAN");
  });

  it("sets data-text attribute for glitch effect", () => {
    render(<GlitchText text="Glitch" />);
    const element = screen.getByText("Glitch");
    expect(element).toHaveAttribute("data-text", "Glitch");
  });

  it("applies glitch-text class", () => {
    render(<GlitchText text="Styled" />);
    const element = screen.getByText("Styled");
    expect(element.className).toContain("glitch-text");
  });

  it("applies custom className", () => {
    render(<GlitchText text="Custom" className="text-4xl" />);
    const element = screen.getByText("Custom");
    expect(element.className).toContain("text-4xl");
  });

  it("applies font-orbitron class", () => {
    render(<GlitchText text="Font" />);
    const element = screen.getByText("Font");
    expect(element.className).toContain("font-orbitron");
  });
});
