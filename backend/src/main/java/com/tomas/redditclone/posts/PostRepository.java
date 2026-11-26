package com.tomas.redditclone.posts;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class PostRepository {

    private static final RowMapper<Post> POST_MAPPER = (row, rowNumber) -> new Post(
            row.getLong("id"),
            row.getString("title"),
            row.getString("body"),
            row.getObject("created_at", OffsetDateTime.class));

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
                """, POST_MAPPER);
    }

    public Optional<Post> findById(long id) {
        return jdbcTemplate.query("""
                SELECT id, title, body, created_at
                FROM posts
                WHERE id = ?
                """, POST_MAPPER, id).stream().findFirst();
    }
}
