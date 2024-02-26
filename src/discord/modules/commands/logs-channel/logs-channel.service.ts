import { Injectable, Logger } from '@nestjs/common';
import { Context, Opts, SlashCommand, SlashCommandContext } from 'necord';
import { LogsChannelDto } from './dto/logs-channel.dto';
import { Client, PermissionFlagsBits } from 'discord.js';
import { InjectRepository } from '@nestjs/typeorm';
import { GuildsEntity } from '../../../entities/guilds.entity';
import { Repository } from 'typeorm';
import { ActionLoggerService } from '../../action-logger/action-logger.service';

@Injectable()
export class LogsChannelService {
  private readonly logger = new Logger(LogsChannelService.name);

  constructor(
    private readonly client: Client,
    @InjectRepository(GuildsEntity)
    private readonly guildRepository: Repository<GuildsEntity>,
    private readonly actionLoggerService: ActionLoggerService,
  ) {}

  @SlashCommand({
    name: 'logs',
    description: 'Set up channel for logs (if empty disable logs)',
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
  })
  public async onLogsChannel(
    @Context() [interaction]: SlashCommandContext,
    @Opts() dto: LogsChannelDto,
  ) {
    const guild = await this.guildRepository.findOne({
      where: { guildId: interaction.guildId },
    });

    if (dto.channel) {
      const updatedGuild = Object.assign(guild, {
        logChannelId: dto.channel.id,
      });
      await this.guildRepository
        .save(updatedGuild)
        .then(async () => {
          await this.actionLoggerService.addLogChannel(
            interaction.guildId,
            interaction.user,
          );

          await interaction.reply({
            content: 'Channel for logs successfully added',
            ephemeral: true,
          });
        })
        .catch(async (e) => {
          await this.client.users.send(
            guild.ownerId,
            `Looks like you want to set up channel for logs in **${guild.name}**, but unfortunately something went wrong. Please try again or contact support`,
          );
          this.logger.error(`Set up logs ${guild.guildId}: ${e}`);
        });

      return Promise.resolve();
    }

    const updatedGuild = Object.assign(guild, {
      logChannelId: null,
    });
    await this.guildRepository
      .save(updatedGuild)
      .then(async () => {
        await interaction.reply({
          content: 'Logs channel successfully removed',
          ephemeral: true,
        });
      })
      .catch(async (e) => {
        await this.client.users.send(
          guild.ownerId,
          `Looks like you want to remove logs channel in **${guild.name}**, but unfortunately something went wrong. Please try again or contact support`,
        );
        this.logger.error(`Remove logs ${guild.guildId}: ${e}`);
      });
  }
}