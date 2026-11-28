package com.tomas.redditclone.users;

public class UsernameTakenException extends RuntimeException {

    public UsernameTakenException() {
        super("That username is already taken.");
    }
}
