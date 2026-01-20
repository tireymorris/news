import { describe, expect, it } from "bun:test";
import EnableDarkMode from "../src/util/EnableDarkMode";

describe("EnableDarkMode component", () => {
  it("should render script tag with dark mode enabling code", () => {
    const component = EnableDarkMode();

    expect(component.type).toBe("script");
    expect(component.props.dangerouslySetInnerHTML.__html).toContain(
      "document.documentElement.classList.add('dark')",
    );
  });
});
