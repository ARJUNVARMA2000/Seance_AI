import unittest
from pathlib import Path

from app import app
from figures import (
    CURATED_COMBOS,
    FEATURED_FIGURE_IDS,
    get_all_figures,
    get_dinner_party_prompt,
    get_system_prompt,
)


class CatalogTests(unittest.TestCase):
    def test_all_original_figures_remain_available(self):
        figures = get_all_figures()
        self.assertEqual(len(figures), 57)
        self.assertEqual(len({figure["id"] for figure in figures}), 57)

    def test_featured_collection_and_provenance_state(self):
        figures = get_all_figures()
        featured = [figure for figure in figures if figure["featured"]]
        self.assertEqual(len(featured), 10)
        self.assertEqual({figure["id"] for figure in featured}, set(FEATURED_FIGURE_IDS))
        for figure in featured:
            self.assertEqual(figure["source_status"], "Sources pending verification")
            self.assertEqual(figure["primary_sources"], [])
            self.assertEqual(figure["secondary_sources"], [])

    def test_exactly_three_valid_curated_salons(self):
        self.assertEqual(len(CURATED_COMBOS), 3)
        for salon in CURATED_COMBOS.values():
            self.assertGreaterEqual(len(salon["guests"]), 2)
            self.assertLessEqual(len(salon["guests"]), 5)
            self.assertTrue(salon["central_question"])
            self.assertEqual(len(salon["starter_questions"]), 3)

    def test_prompts_enforce_temporal_boundaries_and_interpretive_status(self):
        figure_prompt = get_system_prompt("caesar")
        party_prompt = get_dinner_party_prompt(["caesar", "gandhi"])
        self.assertIn("lies beyond your lifetime", figure_prompt)
        self.assertIn("Never claim this generated dialogue", figure_prompt)
        self.assertIn("counterfactual", party_prompt)
        self.assertIn("Knowledge boundary", party_prompt)
        self.assertIn("must explicitly say it lies beyond their lifetime", party_prompt)


class RouteTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True)
        self.client = app.test_client()

    def test_public_get_routes(self):
        for path in ["/", "/api/figures", "/api/figures/curie", "/api/models", "/api/health", "/api/dinner-party/combos"]:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_landing_is_salon_first_and_has_no_cosmic_shell(self):
        html = self.client.get("/").get_data(as_text=True)
        self.assertIn("Who has the", html)
        self.assertIn("AI-generated historical interpretation", html)
        self.assertNotIn("star-field", html)
        self.assertNotIn("constellation-canvas", html)
        self.assertNotIn("AI-powered", html)

    def test_api_exposes_cutoff_without_persona_prompt_notes(self):
        payload = self.client.get("/api/figures/curie").get_json()["figure"]
        self.assertEqual(payload["knowledge_cutoff"], "1934")
        self.assertEqual(payload["source_status"], "Sources pending verification")
        self.assertNotIn("personality", payload)
        self.assertNotIn("beliefs", payload)

    def test_chat_validation_does_not_call_provider(self):
        self.assertEqual(self.client.post("/api/chat", json={}).status_code, 400)
        self.assertEqual(self.client.post("/api/chat", json={"figure_id": "missing", "message": "Hello"}).status_code, 404)
        self.assertEqual(
            self.client.post(
                "/api/dinner-party/chat",
                json={"guests": ["curie"], "message": "Hello"},
            ).status_code,
            400,
        )


class RepositoryHygieneTests(unittest.TestCase):
    def test_readme_matches_the_current_product_and_embeds_screenshots(self):
        readme = Path("README.md").read_text(encoding="utf-8")
        for stale_phrase in ["60+", "Gemini 2.0 Flash", "Seance Mode", "authentic voices"]:
            self.assertNotIn(stale_phrase, readme)
        for screenshot in [
            Path("static/images/readme/archival-salon-desktop.png"),
            Path("static/images/readme/archival-salon-mobile.png"),
        ]:
            self.assertIn(screenshot.as_posix(), readme)
            self.assertTrue(screenshot.exists())
            self.assertGreater(screenshot.stat().st_size, 10_000)

    def test_example_environment_file_documents_runtime_configuration(self):
        example = Path(".env.example").read_text(encoding="utf-8")
        self.assertIn("OPENROUTER_API_KEY=", example)
        self.assertNotIn("sk-", example)

    def test_release_configuration_has_no_abandoned_provider_or_model_ids(self):
        app_source = Path("app.py").read_text(encoding="utf-8")
        template = Path("templates/index.html").read_text(encoding="utf-8")

        retired_model_ids = (
            "google/gemma-3-12b-it:free",
            "google/gemma-3-27b-it:free",
            "google/gemma-3-4b-it:free",
            "meta-llama/llama-3.1-405b-instruct:free",
            "anthropic/claude-3.5-haiku",
        )
        for model_id in retired_model_ids:
            self.assertNotIn(model_id, app_source)

        self.assertFalse(Path("fly.toml").exists())
        self.assertIn("https://github.com/ARJUNVARMA2000/Seance_AI", template)


if __name__ == "__main__":
    unittest.main()
