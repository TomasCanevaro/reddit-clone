package com.tomas.redditclone.users;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<UserResponse> create(String username, String passwordHash) {
        return jdbcTemplate.query("""
                INSERT INTO users (username, password_hash)
                VALUES (?, ?)
                ON CONFLICT (lower(username)) DO NOTHING
                RETURNING id, username, created_at
                """, (row, rowNumber) -> new UserResponse(
                row.getLong("id"),
                row.getString("username"),
                row.getObject("created_at", OffsetDateTime.class)), username, passwordHash)
                .stream().findFirst();
    }
}
