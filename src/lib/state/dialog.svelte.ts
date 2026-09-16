import type { CardColorValue } from "$lib/card";
import type { DialogField } from "$lib/types";

type PendingDialog = {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
};

export const dialog = $state<{
  open: boolean;
  promise: PendingDialog | undefined;
  form: DialogField[];
}>({
  open: false,
  promise: undefined,
  form: [],
});

export const dismissDialog = () => {
  dialog.open = false;
  if (dialog.promise) dialog.promise.reject();
  dialog.promise = undefined;
};

/**
 * Open the dialog with `form` and resolve when the player presses continue.
 * Dismissing the dialog rejects the promise.
 */
export const openDialog = (form: DialogField[], onContinue: () => void) => {
  dialog.form = form;
  dialog.open = true;
  dialog.promise = {
    resolve: () => {
      onContinue();
    },
    reject: () => {},
  };
};

const COLORS: { name: string; color: string; value: CardColorValue }[] = [
  { name: "red", color: "red", value: 0b00 },
  { name: "green", color: "green", value: 0b01 },
  { name: "blue", color: "blue", value: 0b10 },
  { name: "yellow", color: "yellow", value: 0b11 },
];

/** Ask which colour a wild card should take. Rejects if the dialog is dismissed. */
export const selectColor = () =>
  new Promise<CardColorValue>((resolve, reject) => {
    dialog.form = [{ name: "select color", type: "colorselect", options: COLORS }];
    dialog.open = true;

    dialog.promise = {
      resolve: (color: CardColorValue) => {
        resolve(color);
        dialog.open = false;
        dialog.promise = undefined;
      },
      reject,
    };
  });
