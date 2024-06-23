#!/bin/bash

# Path to your SQLite database file
DB_FILE="articles.db"
LOG_FILE="shuffle_created_at.log"

# Log function
log() {
	echo "$(date +%Y-%m-%d\ %H:%M:%S) - $1" | tee -a $LOG_FILE
}

log "Starting shuffle of created_at timestamps"

# Fetch all article ids
article_ids=$(sqlite3 $DB_FILE "SELECT id FROM articles;")
log "Fetched article IDs"

# Generate an array of current timestamps
timestamps=()
for id in $article_ids; do
	timestamps+=($(date +%Y-%m-%d\ %H:%M:%S))
done
log "Generated current timestamps"

# Shuffle the timestamps
shuffled_timestamps=($(shuf -e "${timestamps[@]}"))
log "Shuffled timestamps"

# Update the articles with the shuffled timestamps
index=0
for id in $article_ids; do
	sqlite3 $DB_FILE "UPDATE articles SET created_at = '${shuffled_timestamps[$index]}' WHERE id = '$id';"
	log "Updated article ID $id with new timestamp ${shuffled_timestamps[$index]}"
	index=$((index + 1))
done

log "All articles' created_at timestamps have been shuffled"
