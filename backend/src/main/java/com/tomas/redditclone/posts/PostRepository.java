package com.tomas.redditclone.posts;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class PostRepository {

    private final JdbcTemplate jdbcTemplate;

    public PostRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Post> findLatest() {
        return jdbcTemplate.query("""
                SELECT id, title, body, created_at
                FROM posts
                ORDER BY created_at DESC, id DESC
                LIMIT 50
                """, (row, rowNumber) -> new Post(
                row.getLong("id"),
                row.getString("title"),
                row.getString("body"),
                row.getObject("created_at", OffsetDateTime.class)));
    }
}
