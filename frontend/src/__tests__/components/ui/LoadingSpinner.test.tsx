import { render } from "../../test-utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders a div element", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstElementChild;
    expect(spinner).toBeTruthy();
    expect(spinner!.tagName).toBe("DIV");
  });

  it("has spin animation class", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstElementChild!;
    expect(spinner.className).toContain("animate-spin");
  });

  it("applies rounded-full class", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstElementChild!;
    expect(spinner.className).toContain("rounded-full");
  });

  it("uses medium size by default", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstElementChild!;
    expect(spinner.className).toContain("w-8");
    expect(spinner.className).toContain("h-8");
  });

  it("applies small size", () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.firstElementChild!;
    expect(spinner.className).toContain("w-4");
    expect(spinner.className).toContain("h-4");
  });

  it("applies large size", () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.firstElementChild!;
    expect(spinner.className).toContain("w-12");
    expect(spinner.className).toContain("h-12");
  });

  it("accepts custom className", () => {
    const { container } = render(<LoadingSpinner className="mt-4" />);
    const spinner = container.firstElementChild!;
    expect(spinner.className).toContain("mt-4");
  });
});
