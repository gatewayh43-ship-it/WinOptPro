import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
    content: string;
    children: React.ReactElement;
    side?: "top" | "bottom" | "left" | "right";
    delay?: number;
}

export function Tooltip({ content, children, side = "top", delay = 400 }: TooltipProps) {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = () => {
        timerRef.current = setTimeout(() => {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const GAP = 8;
            let top = 0, left = 0;

            if (side === "top") {
                top = rect.top - GAP;
                left = rect.left + rect.width / 2;
            } else if (side === "bottom") {
                top = rect.bottom + GAP;
                left = rect.left + rect.width / 2;
            } else if (side === "left") {
                top = rect.top + rect.height / 2;
                left = rect.left - GAP;
            } else {
                top = rect.top + rect.height / 2;
                left = rect.right + GAP;
            }

            setPos({ top, left });
            setVisible(true);
        }, delay);
    };

    const hide = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setVisible(false);
    };

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    const transformMap: Record<string, string> = {
        top: "translateX(-50%) translateY(-100%)",
        bottom: "translateX(-50%)",
        left: "translateX(-100%) translateY(-50%)",
        right: "translateY(-50%)",
    };

    const child = children as React.ReactElement & { ref?: React.Ref<HTMLElement> };

    return (
        <>
            {/* Clone child to attach ref + handlers */}
            {(() => {
                const el = child as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
                return (
                    <el.type
                        {...el.props}
                        ref={triggerRef}
                        onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
                            show();
                            el.props.onMouseEnter?.(e);
                        }}
                        onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
                            hide();
                            el.props.onMouseLeave?.(e);
                        }}
                        onFocus={(e: React.FocusEvent<HTMLElement>) => {
                            show();
                            el.props.onFocus?.(e);
                        }}
                        onBlur={(e: React.FocusEvent<HTMLElement>) => {
                            hide();
                            el.props.onBlur?.(e);
                        }}
                    />
                );
            })()}

            {visible && createPortal(
                <div
                    role="tooltip"
                    style={{
                        position: "fixed",
                        top: pos.top,
                        left: pos.left,
                        transform: transformMap[side],
                        zIndex: 9999,
                        pointerEvents: "none",
                    }}
                    className="max-w-[220px] px-2.5 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/10 text-[11px] text-slate-200 leading-snug shadow-2xl"
                >
                    {content}
                </div>,
                document.body
            )}
        </>
    );
}
