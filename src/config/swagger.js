module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'CyberWatch SOC API',
    version: '1.0.0',
    description:
      'REST API for the CyberWatch Security Operations Center — ingest security logs, correlate threats using MITRE ATT&CK rules, and manage incident tickets with role-based access control.',
    contact: {
      name: 'CyberWatch',
      url: 'https://github.com/darkvai/CyberWatch'
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC'
    }
  },
  servers: [
    {
      url: '/v1/cyberwatch',
      description: 'CyberWatch API v1'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'Analyst registration, login, and session management' },
    { name: 'Logs', description: 'Security log ingestion and retrieval' },
    { name: 'Incidents', description: 'Incident ticket lifecycle management' },
    { name: 'Assets', description: 'Discovered network asset inventory' },
    { name: 'Admin', description: 'Administrative operations (L3 only)' }
  ],

  // ──────────────────────────────────────────────────────────────────────
  //  PATHS
  // ──────────────────────────────────────────────────────────────────────
  paths: {

    // ── Authentication ────────────────────────────────────────────────
    '/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new analyst',
        description: 'Provisions a new analyst account with a hashed password and an RBAC tier.',
        operationId: 'registerAnalyst',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              example: {
                name: 'Alice Johnson',
                username: 'alice',
                password: 'SecurePass123!',
                role: 'L1'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Analyst provisioned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Analyst provisioned successfully' },
                    analyst: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '665a1b2c3d4e5f6a7b8c9d0e' },
                        username: { type: 'string', example: 'alice' }
                      }
                    }
                  }
                }
              }
            }
          },
          409: { description: 'Username already in use', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },

    '/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate analyst',
        description: 'Validates credentials and sets an HTTP-only JWT cookie (1-hour expiry). Rate-limited to **5 attempts per 15 minutes** per IP.',
        operationId: 'loginAnalyst',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: { username: 'alice', password: 'SecurePass123!' }
            }
          }
        },
        responses: {
          200: {
            description: 'Authentication successful — JWT set in `jwt` cookie',
            headers: {
              'Set-Cookie': {
                description: 'HTTP-only JWT cookie',
                schema: { type: 'string', example: 'jwt=eyJhbGciOiJIUzI1NiIs...; HttpOnly; Max-Age=3600' }
              }
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Authentication successful' },
                    analyst: { type: 'string', example: 'alice' }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Too many login attempts', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },

    '/logout': {
      get: {
        tags: ['Authentication'],
        summary: 'Log out',
        description: 'Clears the JWT cookie and redirects to the root page.',
        operationId: 'logoutAnalyst',
        responses: {
          302: { description: 'Redirect to /' }
        }
      }
    },

    '/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current analyst identity',
        description: 'Returns the identity decoded from the JWT cookie.',
        operationId: 'getCurrentAnalyst',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Current analyst session',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    logged_in: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/JwtPayload' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized — no or invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },

    // ── Logs ───────────────────────────────────────────────────────────
    '/logs': {
      post: {
        tags: ['Logs'],
        summary: 'Ingest a security log',
        description:
          'Accepts logs in **three formats**: Windows Event Log (Winlogbeat JSON), CEF (Common Event Format), or native CyberWatch JSON. The payload is normalized, validated via Zod, stored, and evaluated by the correlation engine. Authenticated with a **Bearer API key**.',
        operationId: 'ingestLog',
        security: [{ apiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/WinlogbeatPayload' },
                  { $ref: '#/components/schemas/CEFPayload' },
                  { $ref: '#/components/schemas/CyberWatchLogPayload' }
                ]
              },
              examples: {
                winlogbeat: {
                  summary: 'Windows Event Log (Winlogbeat)',
                  value: {
                    host: { hostname: 'DC-01', ip: ['10.0.0.5'] },
                    event: { code: '4625', severity: 'high' },
                    message: 'An account failed to log on'
                  }
                },
                cef: {
                  summary: 'CEF (Common Event Format)',
                  value: {
                    raw: 'CEF:0|Fortinet|FortiGate|7.0|Deny|Port scan|7|src=10.0.0.9 shost=FW-01'
                  }
                },
                cyberwatch_json: {
                  summary: 'Native CyberWatch JSON',
                  value: {
                    hostname: 'AGENT-01',
                    ip_address: '192.168.1.10',
                    event_type: 'Auth_Failure',
                    message: 'Failed login attempt',
                    severity: 'High'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Log received and processed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Log received and processed successfully' },
                    logId: { type: 'string', example: '665a1b2c3d4e5f6a7b8c9d0e' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Malformed log payload (Zod validation failure)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Malformed log payload' },
                    issues: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['hostname: Required', 'severity: Invalid enum value']
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Invalid or missing API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      get: {
        tags: ['Logs'],
        summary: 'Retrieve latest logs',
        description: 'Returns the most recent 100 log events, populated with associated asset data. Requires analyst authentication (L1+).',
        operationId: 'getLogs',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Array of log events',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/LogEvent' }
                }
              }
            }
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient role clearance', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },

    // ── Incidents ──────────────────────────────────────────────────────
    '/incidents': {
      get: {
        tags: ['Incidents'],
        summary: 'List all incidents',
        description: 'Returns all incident tickets sorted by newest first, populated with related asset, log, and analyst data.',
        operationId: 'getAllIncidents',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Array of incidents',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Incident' } }
              }
            }
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      post: {
        tags: ['Incidents'],
        summary: 'Create a manual incident',
        description: 'Creates a new incident ticket manually (analyst-initiated). The `analyst_id` is automatically extracted from the JWT.',
        operationId: 'createIncident',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/IncidentCreateRequest' },
              example: {
                title: 'Suspicious outbound traffic from HR-PC',
                description: 'Repeated connections to known C2 domain observed in firewall logs.',
                severity: 'High',
                asset_id: '665a1b2c3d4e5f6a7b8c9d0e'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Ticket created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Ticket added successfully' },
                    incident: { $ref: '#/components/schemas/Incident' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },

    '/incidents/{id}': {
      get: {
        tags: ['Incidents'],
        summary: 'Get incident by ID',
        description: 'Returns a single incident with populated asset, log, and analyst references.',
        operationId: 'getIncidentById',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IncidentId' }],
        responses: {
          200: {
            description: 'Incident details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Incident' } } }
          },
          400: { description: 'Invalid ID format', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Incident not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      patch: {
        tags: ['Incidents'],
        summary: 'Update incident status',
        description:
          'Transitions the incident to a new status. Enforces a **status FSM** (Open → In Progress → Escalated → Resolved). Optionally supports **optimistic locking** via the `__v` version field. Requires **L2+** clearance.',
        operationId: 'updateIncidentStatus',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IncidentId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StatusUpdateRequest' },
              example: { status: 'In Progress' }
            }
          }
        },
        responses: {
          200: {
            description: 'Updated incident',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Incident' } } }
          },
          400: {
            description: 'Invalid status value or invalid status transition',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          404: { description: 'Incident not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Conflict — stale version (`__v` mismatch)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      delete: {
        tags: ['Incidents'],
        summary: 'Delete an incident',
        description: 'Permanently removes an incident ticket. Requires **L3** clearance.',
        operationId: 'deleteIncident',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IncidentId' }],
        responses: {
          200: {
            description: 'Incident deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Incident successfully deleted' },
                    deletedId: { type: 'string', example: '665a1b2c3d4e5f6a7b8c9d0e' }
                  }
                }
              }
            }
          },
          404: { description: 'Incident not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },

    '/incidents/{id}/escalate': {
      put: {
        tags: ['Incidents'],
        summary: 'Escalate an incident',
        description: 'Sets the incident status to **Escalated** and records the analyst\'s reason. Requires **L2+** clearance.',
        operationId: 'escalateIncident',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/IncidentId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['escalation_reason'],
                properties: {
                  escalation_reason: {
                    type: 'string',
                    minLength: 1,
                    description: 'Mandatory justification for the escalation',
                    example: 'Indicators match known APT-29 TTPs — requires L3 forensic analysis.'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Incident escalated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Incident successfully escalated.' },
                    incident: { $ref: '#/components/schemas/Incident' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Missing escalation reason or invalid ID',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          404: { description: 'Incident not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },

    // ── Assets ─────────────────────────────────────────────────────────
    '/assets': {
      get: {
        tags: ['Assets'],
        summary: 'List all discovered assets',
        description: 'Returns all network assets (auto-discovered via log ingestion), sorted by newest first. Requires **L1+** clearance.',
        operationId: 'getAllAssets',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Array of assets',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Asset' } }
              }
            }
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient role clearance', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },

    // ── Admin ──────────────────────────────────────────────────────────
    '/admin/api-keys': {
      post: {
        tags: ['Admin'],
        summary: 'Generate a new API key',
        description:
          'Creates a new SHA-256-hashed API key for machine-to-machine log ingestion. The raw key is returned **only once** in the response. Requires **L3** clearance.',
        operationId: 'createApiKey',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['consumer_name'],
                properties: {
                  consumer_name: {
                    type: 'string',
                    description: 'Human-readable name for the key consumer',
                    example: 'Winlogbeat - DC01'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Key generated — store it securely',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Store this key securely. It will never be shown again.' },
                    key: { type: 'string', description: 'Raw API key (shown only once)', example: 'cw_live_a1b2c3d4e5f6...' },
                    prefix: { type: 'string', example: 'cw_live_a1b2c3d4' },
                    consumer: { type: 'string', example: 'Winlogbeat - DC01' }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient role clearance (L3 required)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      },
      get: {
        tags: ['Admin'],
        summary: 'List active API keys',
        description: 'Returns metadata for all non-revoked API keys. **Never exposes key hashes or raw keys.** Requires **L3** clearance.',
        operationId: 'listApiKeys',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Array of API key metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ApiKeyMetadata' }
                }
              }
            }
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Insufficient role clearance (L3 required)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    }
  },

  // ──────────────────────────────────────────────────────────────────────
  //  COMPONENTS
  // ──────────────────────────────────────────────────────────────────────
  components: {

    // ── Security Schemes ──────────────────────────────────────────────
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'jwt',
        description: 'HTTP-only JWT cookie set by the `/login` endpoint'
      },
      apiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Bearer API key generated via `/admin/api-keys` (e.g., `cw_live_...`)'
      }
    },

    // ── Reusable Parameters ───────────────────────────────────────────
    parameters: {
      IncidentId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'MongoDB ObjectId of the incident',
        schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '665a1b2c3d4e5f6a7b8c9d0e' }
      }
    },

    // ── Schemas ───────────────────────────────────────────────────────
    schemas: {

      // ── Request bodies ────────────────────────────────────────────
      RegisterRequest: {
        type: 'object',
        required: ['name', 'username', 'password'],
        properties: {
          name: { type: 'string', description: 'Full name', example: 'Alice Johnson' },
          username: { type: 'string', description: 'Unique login username', example: 'alice' },
          password: { type: 'string', format: 'password', description: 'Plaintext password (hashed server-side)', example: 'SecurePass123!' },
          role: { type: 'string', enum: ['L1', 'L2', 'L3'], default: 'L1', description: 'SOC tier' }
        }
      },

      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'alice' },
          password: { type: 'string', format: 'password', example: 'SecurePass123!' }
        }
      },

      IncidentCreateRequest: {
        type: 'object',
        required: ['title', 'description', 'severity'],
        properties: {
          title: { type: 'string', example: 'Suspicious outbound traffic from HR-PC' },
          description: { type: 'string', example: 'Repeated connections to known C2 domain observed in firewall logs.' },
          severity: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
          asset_id: { type: 'string', description: 'ObjectId of the related asset', example: '665a1b2c3d4e5f6a7b8c9d0e' },
          log_id: { type: 'string', description: 'ObjectId of the triggering log', example: '665a1b2c3d4e5f6a7b8c9d0e' }
        }
      },

      StatusUpdateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['Open', 'In Progress', 'Escalated', 'Resolved', 'Flagged'],
            description: 'Target status (must be a valid FSM transition from the current status)'
          }
        }
      },

      // ── Log ingestion payloads ────────────────────────────────────
      WinlogbeatPayload: {
        type: 'object',
        description: 'Windows Event Log forwarded by Winlogbeat / Logstash',
        properties: {
          host: {
            type: 'object',
            properties: {
              hostname: { type: 'string', example: 'DC-01' },
              ip: { type: 'array', items: { type: 'string' }, example: ['10.0.0.5'] }
            }
          },
          event: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'Windows Event ID', example: '4625' },
              severity: { type: 'string', example: 'high' },
              action: { type: 'string', example: 'logon-failed' }
            }
          },
          winlog: {
            type: 'object',
            properties: {
              event_id: { type: 'string' },
              computer_name: { type: 'string' },
              event_data: {
                type: 'object',
                properties: {
                  CommandLine: { type: 'string' }
                }
              }
            }
          },
          process: {
            type: 'object',
            properties: {
              command_line: { type: 'string', example: 'powershell -enc SQBFAFgA' }
            }
          },
          message: { type: 'string', example: 'An account failed to log on' }
        }
      },

      CEFPayload: {
        type: 'object',
        description: 'Common Event Format (CEF) log — raw string in the `raw` field',
        required: ['raw'],
        properties: {
          raw: {
            type: 'string',
            description: 'Full CEF-formatted string',
            example: 'CEF:0|Fortinet|FortiGate|7.0|Deny|Port scan|7|src=10.0.0.9 shost=FW-01'
          }
        }
      },

      CyberWatchLogPayload: {
        type: 'object',
        description: 'Native CyberWatch JSON format (Python agent)',
        required: ['hostname', 'ip_address', 'event_type', 'severity'],
        properties: {
          hostname: { type: 'string', example: 'AGENT-01' },
          ip_address: { type: 'string', format: 'ipv4', example: '192.168.1.10' },
          event_type: { type: 'string', example: 'Auth_Failure' },
          message: { type: 'string', example: 'Failed login attempt', default: 'No message provided' },
          severity: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] }
        }
      },

      // ── Response models ───────────────────────────────────────────
      LogEvent: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665a1b2c3d4e5f6a7b8c9d0e' },
          asset_id: {
            type: 'object',
            description: 'Populated asset reference',
            properties: {
              _id: { type: 'string' },
              hostname: { type: 'string', example: 'DC-01' },
              ip_address: { type: 'string', example: '10.0.0.5' }
            }
          },
          event_type: { type: 'string', example: 'Auth_Failure' },
          message: { type: 'string', example: 'An account failed to log on' },
          severity: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
          command_line: { type: 'string', nullable: true, example: null },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      Incident: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665a1b2c3d4e5f6a7b8c9d0e' },
          title: { type: 'string', example: '[T1110] Brute Force Authentication Attempt on DC-01' },
          description: { type: 'string', example: 'Detected 5 Auth_Failure events within 120s.' },
          severity: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
          status: { type: 'string', enum: ['Open', 'In Progress', 'Escalated', 'Resolved', 'Flagged'], default: 'Open' },
          asset_id: {
            type: 'object',
            description: 'Populated asset',
            properties: {
              _id: { type: 'string' },
              hostname: { type: 'string' },
              ip_address: { type: 'string' },
              criticality: { type: 'string' }
            }
          },
          analyst_id: {
            type: 'object',
            nullable: true,
            description: 'Populated analyst (if manually created)',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' }
            }
          },
          rule_id: { type: 'string', nullable: true, description: 'Correlation rule that triggered this incident', example: 'RULE_T1110_BRUTE_FORCE' },
          related_logs: { type: 'array', items: { type: 'string' }, description: 'ObjectIds of triggering log events' },
          alert_count: { type: 'integer', default: 1, description: 'Number of times this rule has fired for this asset' },
          tags: { type: 'array', items: { type: 'string' }, example: ['T1110'] },
          escalation_reason: { type: 'string', nullable: true },
          due_at: { type: 'string', format: 'date-time', description: 'SLA deadline (auto-calculated from severity)' },
          last_seen: { type: 'string', format: 'date-time' },
          __v: { type: 'integer', description: 'Document version for optimistic concurrency control' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      Asset: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665a1b2c3d4e5f6a7b8c9d0e' },
          hostname: { type: 'string', example: 'dc-01' },
          ip_address: { type: 'string', example: '10.0.0.5' },
          criticality: { type: 'string', default: 'Medium', example: 'Medium' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      ApiKeyMetadata: {
        type: 'object',
        description: 'API key metadata (never includes the hash or raw key)',
        properties: {
          key_prefix: { type: 'string', example: 'cw_live_a1b2c3d4' },
          consumer_name: { type: 'string', example: 'Winlogbeat - DC01' },
          scopes: { type: 'array', items: { type: 'string' }, example: ['logs:write'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },

      JwtPayload: {
        type: 'object',
        description: 'Decoded JWT payload',
        properties: {
          id: { type: 'string', example: '665a1b2c3d4e5f6a7b8c9d0e' },
          username: { type: 'string', example: 'alice' },
          role: { type: 'string', enum: ['L1', 'L2', 'L3'], example: 'L1' }
        }
      },

      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message', example: 'Unauthorized' }
        }
      }
    }
  }
};
