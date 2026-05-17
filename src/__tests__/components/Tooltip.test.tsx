import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/test/utils";
import { Tooltip } from "@/components/Tooltip";

describe("Tooltip", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function renderTooltip(side: "top" | "bottom" | "left" | "right" = "top") {
        render(
            <Tooltip content={`${side} tip`} side={side} delay={25}>
                <button type="button">Target</button>
            </Tooltip>
        );
        const target = screen.getByRole("button", { name: "Target" });
        vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
            top: 100,
            bottom: 140,
            left: 200,
            right: 280,
            width: 80,
            height: 40,
            x: 200,
            y: 100,
            toJSON: () => ({}),
        });
        return target;
    }

    it.each([
        ["top", "translateX(-50%) translateY(-100%)"],
        ["bottom", "translateX(-50%)"],
        ["left", "translateX(-100%) translateY(-50%)"],
        ["right", "translateY(-50%)"],
    ] as const)("positions %s tooltips", (side, transform) => {
        const target = renderTooltip(side);
        fireEvent.mouseEnter(target);
        act(() => {
            vi.advanceTimersByTime(25);
        });

        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveTextContent(`${side} tip`);
        expect(tooltip).toHaveStyle({ transform });
    });

    it("hides the tooltip and clears a pending timer", () => {
        const target = renderTooltip();
        fireEvent.mouseEnter(target);
        fireEvent.mouseLeave(target);
        act(() => {
            vi.advanceTimersByTime(25);
        });
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("supports keyboard focus and blur", () => {
        const target = renderTooltip("bottom");
        fireEvent.focus(target);
        act(() => {
            vi.advanceTimersByTime(25);
        });
        expect(screen.getByRole("tooltip")).toHaveTextContent("bottom tip");

        fireEvent.blur(target);
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
});
