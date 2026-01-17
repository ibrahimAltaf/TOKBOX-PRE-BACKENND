// src/docs/openapi.ts
export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "BullChat Clone API",
    version: "0.1.0",
    description:
      "Anonymous BullChat-like realtime chat API (Express + Socket.IO)....",
    "x-realtime": {
      transport: "socket.io",
      baseUrl: "https://tokbox.nl",
      authFlow: [
        "1) POST /sessions/ensure (sets session cookie)",
        "2) POST /sessions/socket-auth (returns { sessionKey })",
        "3) Socket.IO connect with auth: { sessionKey }",
      ],
      handshakeAuth: { sessionKey: "string" },
      note: "Swagger UI cannot open Socket.IO connections, this section documents the realtime contract only.",
    },
  },
  servers: [ { url: "https://tokbox.nl", description: "Production" },
    { url: "http://localhost:8080", description: "Local dev" },],
  tags: [
    { name: "Health", description: "Service health checks" },
    { name: "Sessions", description: "Anonymous session lifecycle" },
    { name: "Rooms", description: "Public rooms and room management" },
    { name: "RoomMembers", description: "Room membership, roles, kick/ban" },
    { name: "Media", description: "Upload and manage media files" },
    { name: "Messages", description: "Room messages (text + media)" },
    { name: "DM", description: "Private messaging (1-to-1 threads)" },
    {
      name: "Invites",
      description: "Invite links + internal targeted invites",
    },
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
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OkResponse" },
              },
            },
          },
        },
      },
    },

    // ===========================
    // Sessions
    // ===========================
    "/sessions/ensure": {
      post: {
        tags: ["Sessions"],
        summary: "Create or refresh anonymous session (sets cookie)",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EnsureSessionBody" },
            },
          },
        },
        responses: {
          "200": {
            description: "Session created/refreshed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionOkResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
          "200": {
            description: "Current session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionOkResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
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
              schema: { $ref: "#/components/schemas/UpdateMeBody" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionOkResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },

      delete: {
        tags: ["Sessions"],
        summary: "End current anonymous session",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Session ended",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OkResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/sessions/socket-auth": {
      post: {
        tags: ["Sessions"],
        summary: "Get sessionKey for Socket.IO auth (requires cookie session)",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Socket auth key",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SocketAuthOkResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
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
              schema: { $ref: "#/components/schemas/CreateRoomBody" },
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
              schema: { $ref: "#/components/schemas/UpdateRoomBody" },
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
    // RoomMembers
    // ===========================
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
          "401": { description: "Unauthorized" },
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
        responses: {
          "200": { description: "Left" },
          "401": { description: "Unauthorized" },
        },
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
        responses: {
          "200": { description: "Members list" },
          "401": { description: "Unauthorized" },
        },
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
                required: ["targetSessionId"],
                properties: { targetSessionId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Kicked" },
          "403": { description: "Forbidden" },
          "401": { description: "Unauthorized" },
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
                required: ["targetSessionId"],
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
                required: ["folder", "files"],
                properties: {
                  folder: { type: "string", example: "profiles/photos" },
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
          "200": {
            description: "Uploaded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MediaUploadOkResponse" },
              },
            },
          },
          "400": {
            description: "Upload failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ===========================
    // Messages
    // ===========================
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
              schema: { $ref: "#/components/schemas/SendMessageBody" },
            },
          },
        },
        responses: {
          "200": { description: "Message sent" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ===========================
    // DM
    // ===========================
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
                required: ["targetSessionId"],
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
              schema: { $ref: "#/components/schemas/SendMessageBody" },
            },
          },
        },
        responses: {
          "200": { description: "Sent" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ===========================
    // Invites
    // ===========================
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

    "/invites": {
      post: {
        tags: ["Invites"],
        summary: "Create invite (external or internal)",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateInviteBody" },
            },
          },
        },
        responses: {
          "200": { description: "Invite created" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/invites/{token}": {
      get: {
        tags: ["Invites"],
        summary: "Get invite by token (public preview)",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Invite" },
          "404": { description: "Not found" },
        },
      },
    },

    "/invites/{token}/accept": {
      post: {
        tags: ["Invites"],
        summary: "Accept invite token (requires session)",
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
          "200": { description: "Accepted" },
          "400": { description: "Cannot accept" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/invites/{token}/revoke": {
      post: {
        tags: ["Invites"],
        summary: "Revoke invite token (inviter only) (requires session)",
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
          "400": { description: "Cannot revoke" },
          "401": { description: "Unauthorized" },
        },
      },
    },

    // ===========================
    // Users / UsersPics
    // ===========================
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
        responses: {
          "200": {
            description: "Online users",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UsersOnlineOkResponse" },
              },
            },
          },
        },
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
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Users list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UsersPicsOkResponse" },
              },
            },
          },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      SessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "bc_session",
      },
    },

    schemas: {
      OkResponse: {
        type: "object",
        properties: { ok: { type: "boolean", example: true } },
        required: ["ok"],
      },

      ErrorResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: false },
          error: {
            oneOf: [
              { type: "string", example: "UNAUTHORIZED" },
              {
                type: "object",
                properties: {
                  formErrors: { type: "array", items: { type: "string" } },
                  fieldErrors: {
                    type: "object",
                    additionalProperties: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
            ],
          },
        },
        required: ["ok", "error"],
      },

      EnsureSessionBody: {
        type: "object",
        properties: {
          nickname: { type: "string", example: "ibrahim" },
          about: { type: "string", example: "hello world" },
          avatarUrl: {
            type: "string",
            example: "https://cdn.example.com/avatar.png",
          },
          fingerprint: { type: "string", example: "fp-demo-1234567890" },

          // ✅ align with your frontend setup (multi photos + intro video)
          photos: {
            type: "array",
            items: { type: "string" },
            example: ["https://cdn.example.com/p1.jpg"],
          },
          introVideoUrl: {
            type: "string",
            example: "https://cdn.example.com/intro.mp4",
          },
        },
      },

      UpdateMeBody: {
        type: "object",
        properties: {
          nickname: { type: "string" },
          about: { type: "string" },
          avatarUrl: { type: "string" },
          avatarMediaId: { type: "string" },

          photos: { type: "array", items: { type: "string" } },
          introVideoUrl: { type: "string" },
        },
      },

      Session: {
        type: "object",
        properties: {
          id: { type: "string", example: "65f..." },
          nickname: { type: "string", example: "ibrahim" },
          about: { type: "string", nullable: true },
          avatarUrl: { type: "string", nullable: true },
          photos: { type: "array", items: { type: "string" } },
          introVideoUrl: { type: "string", nullable: true },
          isOnline: { type: "boolean", example: true },
          lastSeenAt: { type: "string", nullable: true },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
        },
        required: ["id", "nickname"],
      },

      SessionOkResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          session: { $ref: "#/components/schemas/Session" },
        },
        required: ["ok", "session"],
      },

      SocketAuthOkResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          sessionKey: { type: "string", example: "bc_xxx_session_key" },
        },
        required: ["ok", "sessionKey"],
      },

      CreateRoomBody: {
        type: "object",
        required: ["type", "slug", "title"],
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

      UpdateRoomBody: {
        type: "object",
        properties: {
          title: { type: "string" },
          maxUsers: { type: "integer" },
          isOpen: { type: "boolean" },
        },
      },

      MediaUploadOkResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          urls: {
            type: "array",
            items: { type: "string" },
            example: ["https://cdn.example.com/file.jpg"],
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                url: { type: "string" },
                mime: { type: "string" },
                size: { type: "integer" },
              },
            },
          },
        },
        required: ["ok"],
      },

      SendMessageBody: {
        type: "object",
        properties: {
          text: { type: "string", example: "hello" },
          mediaUrls: { type: "array", items: { type: "string" } },
          mediaIds: { type: "array", items: { type: "string" } },
        },
      },

      UsersOnlineOkResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sessionId: { type: "string" },
                nickname: { type: "string" },
                avatarUrl: { type: "string", nullable: true },
                isOnline: { type: "boolean" },
                lastSeenAt: { type: "string", nullable: true },
              },
              required: ["sessionId", "nickname", "isOnline"],
            },
          },
          nextCursor: { type: "string", nullable: true },
        },
        required: ["ok", "items"],
      },

      UsersPicsOkResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sessionId: { type: "string" },
                nickname: { type: "string" },
                avatarUrl: { type: "string", nullable: true },
                photos: { type: "array", items: { type: "string" } },
                introVideoUrl: { type: "string", nullable: true },
                isOnline: { type: "boolean" },
              },
              required: ["sessionId", "nickname", "isOnline"],
            },
          },
          nextCursor: { type: "string", nullable: true },
        },
        required: ["ok", "items"],
      },

      CreateInviteBody: {
        type: "object",
        required: ["kind", "maxUses"],
        properties: {
          kind: {
            type: "string",
            enum: ["ROOM", "DM", "VIDEO_GROUP", "VIDEO_1ON1"],
            example: "ROOM",
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
} as const;
