import { Router } from "express";
import { sessionsRouter } from "./modules/sessions/routes/sessions.routes";
import { roomsRouter } from "./modules/rooms/routes/rooms.routes";
import { mediaRouter } from "./modules/media/routes/media.routes";
import { messagesRouter } from "./modules/messages/routes/messages.routes";
import { dmRouter } from "./modules/dm/routes/dm.routes";
import { invitesRouter } from "./modules/invites/routes/invites.routes";
import { usersRouter } from "./modules/users/routes/users.routes";
import { usersPicsRouter } from "./modules/usersPics/routes/usersPics.routes";
export function buildRouter() {
  const r = Router();
  r.use("/sessions", sessionsRouter);
  r.use("/rooms", roomsRouter);
  r.use("/media", mediaRouter);
  r.use("/", messagesRouter);
  r.use("/dm", dmRouter);
  r.use("/invites", invitesRouter);
  r.use("/users", usersRouter);
  r.use("/users-pics", usersPicsRouter);
  return r;
}
