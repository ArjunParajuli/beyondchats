<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class ArticleController extends Controller
{
    /**
     * Display a listing of the articles.
     */
    public function index(): JsonResponse
    {
        $articles = Article::orderBy('published_at', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $articles,
        ]);
    }

    /**
     * Store a newly created article in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'excerpt' => 'nullable|string',
            'url' => 'required|url|unique:articles,url',
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $article = Article::create([
            'title' => $request->title,
            'slug' => Str::slug($request->title),
            'excerpt' => $request->excerpt,
            'url' => $request->url,
            'published_at' => $request->published_at ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $article,
            'message' => 'Article created successfully',
        ], 201);
    }

    /**
     * Display the specified article.
     */
    public function show(Article $article): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $article,
        ]);
    }

    /**
     * Update the specified article in storage.
     */
    public function update(Request $request, Article $article): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'excerpt' => 'nullable|string',
            'enhanced_content' => 'nullable|string',
            'url' => 'sometimes|required|url|unique:articles,url,' . $article->id,
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $updateData = $request->only(['title', 'excerpt', 'enhanced_content', 'url', 'published_at']);
        
        if ($request->has('title')) {
            $updateData['slug'] = Str::slug($request->title);
        }

        $article->update($updateData);

        return response()->json([
            'success' => true,
            'data' => $article->fresh(),
            'message' => 'Article updated successfully',
        ]);
    }

    /**
     * Remove the specified article from storage.
     */
    public function destroy(Article $article): JsonResponse
    {
        $article->delete();

        return response()->json([
            'success' => true,
            'message' => 'Article deleted successfully',
        ]);
    }
}

