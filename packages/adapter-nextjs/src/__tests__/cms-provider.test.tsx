import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CMSProvider, useCMS } from "../index";

function Consumer(): React.ReactElement {
  const cms = useCMS();

  return (
    <button onClick={() => cms.toggleDebug()} type="button">
      {cms.isDebug ? "debug-on" : `locale-${cms.locale}`}
    </button>
  );
}

describe("adapter-nextjs CMSProvider", () => {
  it("provides CMS context and toggles debug state", () => {
    render(
      <CMSProvider locale="fr" isDebug={false}>
        <Consumer />
      </CMSProvider>
    );

    const button = screen.getByRole("button");
    expect(button.textContent).toBe("locale-fr");

    fireEvent.click(button);
    expect(button.textContent).toBe("debug-on");
  });
});
