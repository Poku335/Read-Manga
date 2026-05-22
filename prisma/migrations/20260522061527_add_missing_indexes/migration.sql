-- CreateIndex
CREATE INDEX "Manga_createdAt_idx" ON "Manga"("createdAt");

-- CreateIndex
CREATE INDEX "Manga_genre_idx" ON "Manga"("genre");

-- CreateIndex
CREATE INDEX "Manga_status_idx" ON "Manga"("status");

-- CreateIndex
CREATE INDEX "Rating_mangaId_idx" ON "Rating"("mangaId");
