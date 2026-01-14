export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "BullChat Clone API",
    version: "0.1.0",
    description:
      "Anonymous BullChat-like realtime chat API (Express + Socket.IO).",
  },
  servers: [{ url: "http://localhost:8080", description: "Local dev" }],
  tags: [
    { name: "Health", description: "Service health checks" },
    { name: "Sessions", description: "Anonymous session lifecycle" },
    { name: "Rooms", description: "Public rooms and room management" },
    { name: "Media", description: "Upload and manage media files" },
    { name: "Messages", description: "Room messages (text + media)" },
    { name: "DM", description: "Private messaging (1-to-1 threads)" },
    { name: "Invites", description: "Invite links + internal invites" },
    { name: "RoomMembers", description: "Room membership, roles, kick/ban" },
    { name: "Users", description: "Online users and discovery" },
    {
      name: "UsersPics",
      description: "User discovery list with photos (BullChat-like)",
    },
  ],

  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check (Mongo + Redis)",
        responses: { "200": { description: "OK" } },
      },
    },

    // ===========================
    // Sessions
    // ===========================
    "/sessions/ensure": {
      post: {
        tags: ["Sessions"],
        summary: "Create or refresh anonymous session",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nickname: { type: "string", example: "ibrahim" },
                  about: { type: "string", example: "hello world" },
                  avatarUrl: {
                    type: "string",
                    example: "https://cdn.example.com/avatar.png",
                  },
                  fingerprint: {
                    type: "string",
                    example: "fp-demo-1234567890",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Session created/refreshed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    session: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        sessionKey: { type: "string" },
                        nickname: { type: "string", nullable: true },
                        about: { type: "string", nullable: true },
                        avatarUrl: { type: "string", nullable: true },
                        lastSeenAt: { type: "string", format: "date-time" },
                        endedAt: {
                          type: "string",
                          format: "date-time",
                          nullable: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/sessions/me": {
      get: {
        tags: ["Sessions"],
        summary: "Get current anonymous session",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": { description: "Current session" },
          "401": { description: "Missing or invalid session" },
        },
      },

      patch: {
        tags: ["Sessions"],
        summary: "Update current anonymous session",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nickname: { type: "string" },
                  about: { type: "string" },
                  avatarUrl: { type: "string" },
                  avatarMediaId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated session" },
          "401": { description: "Missing or invalid session" },
        },
      },

      delete: {
        tags: ["Sessions"],
        summary: "End current anonymous session",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": { description: "Session ended" },
          "401": { description: "Missing or invalid session" },
        },
      },
    },

    // ===========================
    // Rooms
    // ===========================
    "/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "List public rooms",
        parameters: [
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["PUBLIC", "PRIVATE", "VIDEO_GROUP", "VIDEO_1ON1"],
            },
          },
          { name: "q", in: "query", schema: { type: "string" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Rooms list" } },
      },

      post: {
        tags: ["Rooms"],
        summary: "Create a room (requires session)",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["PUBLIC", "PRIVATE", "VIDEO_GROUP", "VIDEO_1ON1"],
                    example: "PUBLIC",
                  },
                  slug: { type: "string", example: "general-chat" },
                  title: { type: "string", example: "General" },
                  maxUsers: { type: "integer", example: 50 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Room created" },
          "401": { description: "Missing/invalid session" },
        },
      },
    },

    "/rooms/{id}": {
      get: {
        tags: ["Rooms"],
        summary: "Get room by id",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Room details" },
          "404": { description: "Not found" },
        },
      },

      patch: {
        tags: ["Rooms"],
        summary:
          "Update room (requires session; owner/admin enforcement later)",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  maxUsers: { type: "integer" },
                  isOpen: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Room updated" },
          "401": { description: "Unauthorized" },
        },
      },

      delete: {
        tags: ["Rooms"],
        summary: "Close room (requires session; owner/admin enforcement later)",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Room closed" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ===========================
    // Media
    // ===========================
    "/media/upload": {
      post: {
        tags: ["Media"],
        summary: "Upload media (images/videos/audio) to storage",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  folder: { type: "string", example: "avatars" },
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Uploaded" },
          "400": { description: "Upload failed" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/rooms/{roomId}/messages": {
      get: {
        tags: ["Messages"],
        summary: "List room messages (paginated)",
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 30 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Messages list" } },
      },
      post: {
        tags: ["Messages"],
        summary: "Send room message (requires session)",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: { type: "string", example: "hello" },
                  mediaUrls: { type: "array", items: { type: "string" } },
                  mediaIds: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Message sent" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/dm/threads": {
      post: {
        tags: ["DM"],
        summary: "Open/create DM thread with another session",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { targetSessionId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Thread opened" },
          "401": { description: "Unauthorized" },
        },
      },
      get: {
        tags: ["DM"],
        summary: "List my DM threads",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 30 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Threads list" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/dm/threads/{threadId}/messages": {
      get: {
        tags: ["DM"],
        summary: "List DM messages",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "threadId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 30 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Messages list" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["DM"],
        summary: "Send DM message",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "threadId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  mediaUrls: { type: "array", items: { type: "string" } },
                  mediaIds: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Sent" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/invites/preview/{token}": {
      get: {
        tags: ["Invites"],
        summary: "Preview invite by token (no session required)",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Invite preview" },
          "404": { description: "Not found" },
        },
      },
    },

    "/invites": {
      post: {
        tags: ["Invites"],
        summary: "Create invite (external or internal)",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  kind: {
                    type: "string",
                    enum: ["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"],
                  },
                  roomId: { type: "string" },
                  dmThreadId: { type: "string" },
                  targetSessionId: { type: "string" },
                  maxUses: { type: "integer", example: 1 },
                  ttlMinutes: { type: "integer", example: 60 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Invite created" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/invites/incoming": {
      get: {
        tags: ["Invites"],
        summary: "List incoming internal invites (targeted)",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 30 },
          },
        ],
        responses: {
          "200": { description: "Incoming invites" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/invites/accept": {
      post: {
        tags: ["Invites"],
        summary: "Accept invite (requires session)",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { token: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Accepted" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/invites/{token}": {
      delete: {
        tags: ["Invites"],
        summary: "Revoke invite (inviter only)",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Revoked" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/rooms/{roomId}/join": {
      post: {
        tags: ["RoomMembers"],
        summary: "Join a room (creates/updates membership)",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Joined" },
          "400": { description: "Join failed" },
        },
      },
    },

    "/rooms/{roomId}/leave": {
      post: {
        tags: ["RoomMembers"],
        summary: "Leave a room",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Left" } },
      },
    },

    "/rooms/{roomId}/members": {
      get: {
        tags: ["RoomMembers"],
        summary: "List active room members",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100 },
          },
        ],
        responses: { "200": { description: "Members list" } },
      },
    },

    "/rooms/{roomId}/kick": {
      post: {
        tags: ["RoomMembers"],
        summary: "Kick a member (OWNER only)",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { targetSessionId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Kicked" },
          "403": { description: "Forbidden" },
        },
      },
    },

    "/rooms/{roomId}/ban": {
      post: {
        tags: ["RoomMembers"],
        summary: "Ban a member (OWNER only)",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "roomId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  targetSessionId: { type: "string" },
                  minutes: { type: "integer", example: 60 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Banned" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/users/online": {
      get: {
        tags: ["Users"],
        summary: "List online users (global)",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 60 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Online users" } },
      },
    },
    "/users-pics": {
      get: {
        tags: ["UsersPics"],
        summary: "List users with photos (online-only by default)",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 60 },
          },
          {
            name: "onlineOnly",
            in: "query",
            schema: { type: "boolean", default: true },
          },
        ],
        responses: {
          "200": { description: "Users list" },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      SessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: process.env.SESSION_COOKIE_NAME || "bc_session",
      },
    },
  },
} as const;
