## Purpose

共享 UI 组件的行为契约。这些组件被所有页面复用，其交互细节（图标解析、BottomSheet 内的键盘避让输入等）一旦走样会同时影响多处界面，因此单独立 spec 约束。

## Requirements

### Requirement: Icon rendering in shared components
The AppChip component SHALL render Lucide icons using the project's `Icon` component instead of passing icon name strings to Paper's `icon` prop. The icon SHALL be displayed to the left of the chip label. The AppButton component SHALL render Lucide icons using the project's `Icon` component, passed as a React element to Paper's `icon` prop.

### Requirement: BottomSheet keyboard-aware text input
The shared TextInput component SHALL support a `bottomSheet` boolean prop. When `bottomSheet` is true, the component SHALL render `BottomSheetTextInput` from `@gorhom/bottom-sheet` instead of Paper's TextInput, ensuring proper keyboard handling inside BottomSheet containers. The visual appearance SHALL remain consistent between both modes.

### Requirement: BottomSheet TextInput export
The BottomSheet shared component module SHALL export `BottomSheetTextInput` for use in forms that require direct access to the BottomSheet-compatible input component.
