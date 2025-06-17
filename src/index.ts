import { z } from 'zod'
import { Agent } from '@openserv-labs/sdk'
import axios from 'axios'
import 'dotenv/config'

interface AuthorDetails {
  author_handle: string
  name: string | null
  bio: string | null
  url_in_bio: string | null
  profile_image_url: string | null
  profile_banner_url: string | null
  followers_count: number | null
  followings_count: number | null
  account_created_at: string | null
  crypto_tweets_all: number | null
  crypto_tweets_views_all: number | null
  engagement_score: number | null
  followers_impact: number | null
  total_symbols_mentioned: number | null
  symbols_mentioned_in_last_24hr: number | null
  new_symbols_mentioned_in_last_24hr: number | null
  unique_author_handle_count: number | null
  total_mention_count: number | null
  tags: string[]
  mentions_24hr: number | null
  mindshare: number | null
  smart_followers_count: number | null
}

interface CredBuzzResponse {
  result: AuthorDetails
  message: string
}

interface Tweet {
  tweet_id: string
  author_handle: string
  content: string
  created_at: string
  view_count: number
  like_count: number
  reply_count: number
  retweet_count: number
  quote_count: number
  bookmark_count: number
  symbols_mentioned: string[]
}

interface TopTweetsResponse {
  result: Tweet[]
  message: string
}

// Create the agent
const agent = new Agent({
  systemPrompt: 'You are an agent that can fetch author details for user provided input'
})

// Add author details capability
agent.addCapability({
  name: 'getAuthorDetails',
  description: 'Fetches comprehensive author details from cred.buzz API using author handle',
  schema: z.object({
    author_handle: z.string().describe('The author handle to fetch details for (without @ symbol)')
  }),
  async run({ args }) {
    try {
      console.log(`Fetching details for author: ${args.author_handle}`)

      const response = await axios.get<CredBuzzResponse>(
        `https://api.cred.buzz/user/author-handle-details?author_handle=${encodeURIComponent(args.author_handle)}`
      )

      if (!response.data || !response.data.result) {
        return 'No author details found for the provided handle.'
      }

      const author = response.data.result

      // Format the response in a readable way
      const formattedDetails = {
        handle: author.author_handle,
        name: author.name || 'N/A',
        bio: author.bio || 'N/A',
        profileUrl: author.url_in_bio || 'N/A',
        followers: author.followers_count?.toLocaleString() || 'N/A',
        following: author.followings_count?.toLocaleString() || 'N/A',
        accountCreated: author.account_created_at || 'N/A',
        cryptoTweets: author.crypto_tweets_all?.toLocaleString() || 'N/A',
        cryptoTweetViews: author.crypto_tweets_views_all?.toLocaleString() || 'N/A',
        engagementScore: author.engagement_score || 'N/A',
        followersImpact: author.followers_impact || 'N/A',
        symbolsMentioned: author.total_symbols_mentioned || 'N/A',
        symbolsLast24h: author.symbols_mentioned_in_last_24hr || 'N/A',
        newSymbolsLast24h: author.new_symbols_mentioned_in_last_24hr || 'N/A',
        mentions24h: author.mentions_24hr || 'N/A',
        mindshare: author.mindshare || 'N/A',
        smartFollowers: author.smart_followers_count?.toLocaleString() || 'N/A',
        tags: author.tags.length > 0 ? author.tags : ['None']
      }

      return JSON.stringify(formattedDetails, null, 2)
    } catch (error) {
      console.error('Error fetching author details:', error)

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return 'Author not found. Please check the handle and try again.'
        } else if (error.response?.status === 429) {
          return 'Rate limit exceeded. Please try again later.'
        } else {
          return `API error: ${error.response?.status} - ${error.response?.statusText}`
        }
      }

      return `Error fetching author details: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})

// Add top tweets capability
agent.addCapability({
  name: 'getTopTweets',
  description: 'Fetches top tweets for an author from cred.buzz API with configurable parameters',
  schema: z.object({
    author_handle: z.string().describe('The author handle to fetch tweets for (without @ symbol)'),
    interval: z
      .enum(['1day', '7day', '30day'])
      .default('7day')
      .describe('Time interval for top tweets (default: 7day)'),
    sort_by: z
      .enum([
        'view_count_desc',
        'like_count_desc',
        'reply_count_desc',
        'retweet_count_desc',
        'created_at_desc'
      ])
      .default('view_count_desc')
      .describe('Sort tweets by this metric (default: view_count_desc)'),
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(5)
      .describe('Number of tweets to fetch (1-50, default: 5)')
  }),
  async run({ args }) {
    try {
      console.log(`Fetching top tweets for author: ${args.author_handle}`)

      const params = new URLSearchParams({
        author_handle: args.author_handle,
        interval: args.interval,
        sort_by: args.sort_by,
        limit: args.limit.toString()
      })

      const response = await axios.get<TopTweetsResponse>(
        `https://api.cred.buzz/user/get-top-tweets?${params.toString()}`
      )

      if (!response.data) {
        return 'No response received from the API.'
      }

      if (!response.data.result || response.data.result.length === 0) {
        return `No tweets found for author "${args.author_handle}" in the specified time period.`
      }

      const tweets = response.data.result

      // Format the tweets in a readable way
      const formattedTweets = tweets.map((tweet, index) => ({
        position: index + 1,
        tweetId: tweet.tweet_id,
        content: tweet.content,
        createdAt: tweet.created_at,
        metrics: {
          views: tweet.view_count?.toLocaleString() || 'N/A',
          likes: tweet.like_count?.toLocaleString() || 'N/A',
          replies: tweet.reply_count?.toLocaleString() || 'N/A',
          retweets: tweet.retweet_count?.toLocaleString() || 'N/A',
          quotes: tweet.quote_count?.toLocaleString() || 'N/A',
          bookmarks: tweet.bookmark_count?.toLocaleString() || 'N/A'
        },
        symbolsMentioned: tweet.symbols_mentioned || []
      }))

      const summary = {
        author: args.author_handle,
        totalTweets: tweets.length,
        interval: args.interval,
        sortedBy: args.sort_by,
        tweets: formattedTweets
      }

      return JSON.stringify(summary, null, 2)
    } catch (error) {
      console.error('Error fetching top tweets:', error)

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return 'Author not found or no tweets available. Please check the handle and try again.'
        } else if (error.response?.status === 429) {
          return 'Rate limit exceeded. Please try again later.'
        } else {
          return `API error: ${error.response?.status} - ${error.response?.statusText}`
        }
      }

      return `Error fetching top tweets: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})

// Start the agent's HTTP server
agent.start()

async function main() {
  // Test the author details capability
  const authorDetails = await agent.process({
    messages: [
      {
        role: 'user',
        content: 'Get details for author kaitoai'
      }
    ]
  })

  console.log('Author Details:', authorDetails.choices[0].message.content)
}

main().catch(console.error)
