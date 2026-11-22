package com.tomas.redditclone;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class RedditCloneApplicationTests {

	@Autowired
	JdbcTemplate jdbcTemplate;

	@Test
	void connectsToPostgres() {
		assertEquals("reddit_clone", jdbcTemplate.queryForObject("select current_database()", String.class));
	}

}
