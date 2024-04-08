CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DROP TABLE IF EXISTS jobs;
CREATE TABLE jobs (
    jobId UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numValues INT,
    numFiles INT,
    status VARCHAR(255)
);