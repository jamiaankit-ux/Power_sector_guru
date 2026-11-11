"use client";
import { startTransition, type FormEvent } from "react";

/** Submits a form to a server action without React clearing the fields, so learners don't retype after an error. */
export const keepValues = (action: (fd: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => action(fd));
};
