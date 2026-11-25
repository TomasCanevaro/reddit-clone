package com.tomas.redditclone.posts;

import java.time.OffsetDateTime;

public record Post(long id, String title, String body, OffsetDateTime createdAt) {
}
