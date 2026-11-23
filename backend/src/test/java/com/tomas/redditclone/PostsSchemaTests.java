package com.tomas.redditclone;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class PostsSchemaTests {

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void persistsPostWithGeneratedIdAndTimestamp() {
        var post = jdbcTemplate.queryForMap(
                "INSERT INTO posts (title, body) VALUES (?, ?) RETURNING id, title, body, created_at",
                "My first post", "Hello, community!");

        long id = ((Number) post.get("id")).longValue();
        assertTrue(id > 0);
        assertEquals("My first post", post.get("title"));
        assertEquals("Hello, community!", jdbcTemplate.queryForObject(
                "SELECT body FROM posts WHERE id = ?", String.class, id));
        assertNotNull(jdbcTemplate.queryForObject(
                "SELECT created_at FROM posts WHERE id = ?", OffsetDateTime.class, id));
    }

    @Test
    void rejectsBlankTitle() {
        assertThrows(DataIntegrityViolationException.class, () ->
                jdbcTemplate.update("INSERT INTO posts (title) VALUES (?)", "   "));
    }

    @Test
    void rejectsTitleLongerThan300Characters() {
        assertThrows(DataIntegrityViolationException.class, () ->
                jdbcTemplate.update("INSERT INTO posts (title) VALUES (?)", "a".repeat(301)));
    }
}
