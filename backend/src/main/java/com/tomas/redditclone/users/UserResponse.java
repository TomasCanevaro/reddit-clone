package com.tomas.redditclone.users;

import java.time.OffsetDateTime;

// Public account information only; credentials never belong in API responses.
public record UserResponse(long id, String username, OffsetDateTime createdAt) {
}
