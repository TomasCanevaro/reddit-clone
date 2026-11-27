package com.tomas.redditclone;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class UsersSchemaTests {

    // Schema tests use an explicit placeholder, not a usable login credential.
    private static final String HASH_PLACEHOLDER = "test-only-hash-placeholder";

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void persistsUserWithGeneratedIdAndTimestamp() {
        String username = uniqueUsername();
        Long id = insertUser(username, HASH_PLACEHOLDER);

        assertNotNull(id);
        assertTrue(id > 0);
        assertEquals(username, jdbcTemplate.queryForObject(
                "SELECT username FROM users WHERE id = ?", String.class, id));
        assertEquals(HASH_PLACEHOLDER, jdbcTemplate.queryForObject(
                "SELECT password_hash FROM users WHERE id = ?", String.class, id));
        assertNotNull(jdbcTemplate.queryForObject(
                "SELECT created_at FROM users WHERE id = ?", OffsetDateTime.class, id));
    }

    @Test
    void rejectsDuplicateUsername() {
        String username = uniqueUsername();
        insertUser(username, HASH_PLACEHOLDER);
        assertThrows(DataIntegrityViolationException.class, () -> insertUser(username, HASH_PLACEHOLDER));
    }

    @Test
    void rejectsUsernameThatDiffersOnlyInCase() {
        String username = uniqueUsername();
        insertUser(username, HASH_PLACEHOLDER);
        assertThrows(DataIntegrityViolationException.class, () ->
                insertUser(username.toUpperCase(java.util.Locale.ROOT), HASH_PLACEHOLDER));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  ", "ab", "abcdefghijklmnopqrstu", "has space", "user.name", "café"})
    void rejectsInvalidUsername(String username) {
        assertThrows(DataIntegrityViolationException.class, () -> insertUser(username, HASH_PLACEHOLDER));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    void rejectsBlankPasswordHash(String hash) {
        assertThrows(DataIntegrityViolationException.class, () -> insertUser(uniqueUsername(), hash));
    }

    @Test
    void rejectsMissingPasswordHash() {
        assertThrows(DataIntegrityViolationException.class, () -> insertUser(uniqueUsername(), null));
    }

    private Long insertUser(String username, String hash) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id",
                Long.class, username, hash);
    }

    private String uniqueUsername() {
        return "User_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
