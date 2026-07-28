// Client-side function middleware that forwards the currently selected
// student id (chosen by the user via <StudentSwitcher>) to every server
// function call as the `x-active-student` header. The server middleware
// and the SQL helper `active_student_from_header()` validate the id
// against the caller's real ownership before honouring it.

import { createMiddleware } from "@tanstack/react-start";

export const ACTIVE_STUDENT_STORAGE_KEY = "student-app:active-student";

function readActiveStudentId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_STUDENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export const attachActiveStudent = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const id = readActiveStudentId();
  return next({ headers: id ? { "x-active-student": id } : {} });
});
