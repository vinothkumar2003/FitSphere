package com.fitsphere.model;

public enum Gender {
    MALE("Male"),
    FEMALE("Female"),
    NOT_SPECIFIED("not specified");

    private final String value;

    Gender(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
