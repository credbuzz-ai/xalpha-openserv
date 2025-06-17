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

// Start the agent's HTTP server
agent.start()

// async function main() {
//   // Test the author details capability
//   const authorDetails = await agent.process({
//     messages: [
//       {
//         role: 'user',
//         content: 'Get details for author kaitoai'
//       }
//     ]
//   })

//   console.log('Author Details:', authorDetails.choices[0].message.content)
// }

// main().catch(console.error)
