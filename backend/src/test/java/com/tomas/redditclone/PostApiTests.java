package com.tomas.redditclone;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostApiTests {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @BeforeEach
    void isolatePostsWithinRolledBackTransaction() {
        jdbcTemplate.update("DELETE FROM posts");
    }

    @Test
    void returnsEmptyArrayWhenThereAreNoPosts() throws Exception {
        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void returnsPostsNewestFirstAndUsesIdToBreakTimestampTies() throws Exception {
        var older = OffsetDateTime.parse("2026-01-01T10:00:00Z");
        var newer = older.plusDays(1);
        insertPost("Older", "First body", older);
        insertPost("Newer", "Second body", newer);
        Long latestId = insertPost("Newest tie", "Third body", newer);

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].id").value(latestId))
                .andExpect(jsonPath("$[0].title").value("Newest tie"))
                .andExpect(jsonPath("$[0].body").value("Third body"))
                .andExpect(jsonPath("$[0].createdAt").isString())
                .andExpect(jsonPath("$[1].title").value("Newer"))
                .andExpect(jsonPath("$[2].title").value("Older"));
    }

    @Test
    void returnsOnlyThe50NewestPosts() throws Exception {
        var timestamp = OffsetDateTime.parse("2026-01-01T10:00:00Z");
        for (int index = 1; index <= 51; index++) {
            insertPost("Post " + index, "", timestamp.plusMinutes(index));
        }

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(50))
                .andExpect(jsonPath("$[0].title").value("Post 51"))
                .andExpect(jsonPath("$[49].title").value("Post 2"));
    }

    private Long insertPost(String title, String body, OffsetDateTime createdAt) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO posts (title, body, created_at) VALUES (?, ?, ?) RETURNING id",
                Long.class, title, body, createdAt);
    }
}
